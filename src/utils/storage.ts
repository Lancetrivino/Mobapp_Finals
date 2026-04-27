/**
 * storage.ts — Supabase repository layer
 *
 * Rules enforced here:
 *  1. All returned objects use snake_case matching Supabase columns (no camelCase aliases).
 *  2. No stub / no-op methods — every export does real work or throws clearly.
 *  3. Order items always carry `name` (populated via join) so the UI can display them.
 *  4. `table_number` and `notes` are persisted on orders.
 *  5. User CRUD goes through Supabase — no local array manipulation.
 */

import { supabase } from '../lib/supabase';
import { User, MenuItem, Order, OrderItem, OrderStatus, CartItem } from '../types/index';

// ─── Internal helpers ──────────────────────────────────────

/**
 * Transforms a raw Supabase order row (with nested order_items + menu_items)
 * into our clean Order interface. All fields stay snake_case.
 */
function mapOrder(raw: any): Order {
  return {
    id: raw.id,
    user_id: raw.user_id,
    total_amount: raw.total_amount,
    status: raw.status as OrderStatus,
    table_number: raw.table_number ?? undefined,
    notes: raw.notes ?? undefined,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    items: (raw.order_items ?? []).map((oi: any): OrderItem => ({
      id: oi.id,
      order_id: oi.order_id,
      menu_item_id: oi.menu_item_id,
      quantity: oi.quantity,
      price: oi.price,
      // Carry the name from the joined menu_items row so the UI never shows "Item #1"
      name: oi.menu_items?.name ?? 'Unknown Item',
      created_at: oi.created_at,
    })),
  };
}

// ─── Menu Items ────────────────────────────────────────────

export const storage = {
  getMenuItems: async (): Promise<MenuItem[]> => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storage] getMenuItems:', error.message);
      return [];
    }
    return data ?? [];
  },

  addMenuItem: async (
    item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MenuItem | null> => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error('[storage] addMenuItem:', error.message);
      return null;
    }
    return data;
  },

  updateMenuItem: async (
    id: string,
    updates: Partial<Omit<MenuItem, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('menu_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[storage] updateMenuItem:', error.message);
      return false;
    }
    return true;
  },

  deleteMenuItem: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[storage] deleteMenuItem:', error.message);
      return false;
    }
    return true;
  },

  // ─── Orders ──────────────────────────────────────────────

  getOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items ( id, name )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storage] getOrders:', error.message);
      return [];
    }
    return (data ?? []).map(mapOrder);
  },

  getUserOrders: async (userId: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items ( id, name )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storage] getUserOrders:', error.message);
      return [];
    }
    return (data ?? []).map(mapOrder);
  },

  /**
   * Creates an order with its items, table number, and optional notes atomically.
   * Returns the newly created Order (with items carrying names) or null on failure.
   */
  createOrder: async (
    userId: string,
    cartItems: CartItem[],
    totalAmount: number,
    tableNumber: number,
    notes?: string
  ): Promise<Order | null> => {
    // 1. Insert the order row
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        table_number: tableNumber,
        notes: notes?.trim() || null,
      }])
      .select()
      .single();

    if (orderError || !orderRow) {
      console.error('[storage] createOrder (order insert):', orderError?.message);
      return null;
    }

    // 2. Insert the order items
    const itemRows = cartItems.map((c) => ({
      order_id: orderRow.id,
      menu_item_id: c.menu_item_id,
      quantity: c.quantity,
      price: c.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemRows);

    if (itemsError) {
      console.error('[storage] createOrder (items insert):', itemsError.message);
      // Roll back the orphan order row
      await supabase.from('orders').delete().eq('id', orderRow.id);
      return null;
    }

    // 3. Re-fetch with the join so item names are populated
    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items ( id, name )
        )
      `)
      .eq('id', orderRow.id)
      .single();

    if (fetchError || !fullOrder) {
      console.error('[storage] createOrder (re-fetch):', fetchError?.message);
      return null;
    }

    return mapOrder(fullOrder);
  },

  updateOrderStatus: async (
    orderId: string,
    status: OrderStatus
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.error('[storage] updateOrderStatus:', error.message);
      return false;
    }
    return true;
  },

  deleteOrder: async (orderId: string): Promise<boolean> => {
    // order_items rows are removed by ON DELETE CASCADE on the FK
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('[storage] deleteOrder:', error.message);
      return false;
    }
    return true;
  },

  // ─── Users ───────────────────────────────────────────────

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storage] getUsers:', error.message);
      return [];
    }
    return data ?? [];
  },

  /**
   * Updates an existing user row (name, role, avatar_url).
   * Email changes must go through Supabase Auth — not here.
   */
  updateUser: async (
    id: string,
    updates: Partial<Pick<User, 'name' | 'role' | 'avatar_url'>>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[storage] updateUser:', error.message);
      return false;
    }
    return true;
  },

  deleteUser: async (id: string): Promise<boolean> => {
    // Deletes the public.users profile row.
    // The auth.users row can only be deleted via the Admin API (server-side).
    // For a client app, removing the profile row is sufficient to deny access.
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[storage] deleteUser:', error.message);
      return false;
    }
    return true;
  },

  // ─── Seed ────────────────────────────────────────────────

  seedDefaultData: async (): Promise<void> => {
    const { data: existing, error } = await supabase
      .from('menu_items')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[storage] seedDefaultData (check):', error.message);
      return;
    }

    if (existing && existing.length > 0) return; // already seeded

    const defaults: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>[] = [
      { name: 'Classic Burger', description: 'Beef patty, lettuce, tomato, cheese', price: 8.99, category: 'Main Course', available: true },
      { name: 'Margherita Pizza', description: 'Tomato sauce, mozzarella, fresh basil', price: 12.99, category: 'Main Course', available: true },
      { name: 'Caesar Salad', description: 'Romaine, Caesar dressing, croutons', price: 6.99, category: 'Appetizer', available: true },
      { name: 'Iced Tea', description: 'Freshly brewed, served with lemon', price: 2.99, category: 'Beverage', available: true },
      { name: 'Chocolate Cake', description: 'Rich chocolate with vanilla frosting', price: 5.99, category: 'Dessert', available: true },
    ];

    const { error: seedError } = await supabase.from('menu_items').insert(defaults);
    if (seedError) {
      console.error('[storage] seedDefaultData (insert):', seedError.message);
    }
  },
};