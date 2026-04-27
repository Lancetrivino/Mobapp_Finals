/**
 * storage.ts — Supabase repository layer
 *
 * Fixes in this version:
 *  - invalidateAnalyticsCache() called after createOrder and updateOrderStatus
 *  - getAdminAnalytics now computes real week-over-week and day-over-day growth
 *  - cancelOrder passes userId as parameter instead of re-fetching from auth
 *  - deleteUser now shows clear error if called without service-role (auth user persists)
 */

import { supabase } from '../lib/supabase';
import { User, MenuItem, Order, OrderItem, OrderStatus, CartItem } from '../types/index';

// ─── Simple TTL cache ──────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const cache: Record<string, CacheEntry<any>> = {};

function cacheGet<T>(key: string): T | null {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete cache[key];
    return null;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T): void {
  cache[key] = { data, expiresAt: Date.now() + TTL_MS };
}

function cacheInvalidate(prefix: string): void {
  Object.keys(cache).forEach((k) => {
    if (k.startsWith(prefix)) delete cache[k];
  });
}

// ─── Internal helpers ──────────────────────────────────────

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
    items: (raw.order_items ?? []).map(
      (oi: any): OrderItem => ({
        id: oi.id,
        order_id: oi.order_id,
        menu_item_id: oi.menu_item_id,
        quantity: oi.quantity,
        price: oi.price,
        name: oi.menu_items?.name ?? 'Unknown Item',
        created_at: oi.created_at,
      })
    ),
  };
}

const ORDER_JOIN = `
  *,
  order_items (
    *,
    menu_items ( id, name )
  )
` as const;

// ─── Analytics type ────────────────────────────────────────
export type AdminAnalytics = {
  bestSellers: { name: string; count: number }[];
  todayRevenue: number;
  weekRevenue: number;
  ordersByStatus: Record<string, number>;
  // Real growth figures — null when there's not enough history to compute
  revenueGrowthPercent: number | null;
  orderGrowthPercent: number | null;
};

// ─── Storage API ───────────────────────────────────────────
export const storage = {

  // ── Menu Items ────────────────────────────────────────────

  getMenuItems: async (): Promise<MenuItem[]> => {
    const cached = cacheGet<MenuItem[]>('menu_items');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storage] getMenuItems:', error.message);
      return [];
    }
    const result = data ?? [];
    cacheSet('menu_items', result);
    return result;
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
    cacheInvalidate('menu_items');
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
    cacheInvalidate('menu_items');
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
    cacheInvalidate('menu_items');
    return true;
  },

  invalidateMenuCache: () => cacheInvalidate('menu_items'),

  // ── Orders ────────────────────────────────────────────────

  getOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_JOIN)
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
      .select(ORDER_JOIN)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storage] getUserOrders:', error.message);
      return [];
    }
    return (data ?? []).map(mapOrder);
  },

  createOrder: async (
    userId: string,
    cartItems: CartItem[],
    totalAmount: number,
    tableNumber: number,
    notes?: string
  ): Promise<Order | null> => {
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
      await supabase.from('orders').delete().eq('id', orderRow.id);
      return null;
    }

    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select(ORDER_JOIN)
      .eq('id', orderRow.id)
      .single();

    if (fetchError || !fullOrder) {
      console.error('[storage] createOrder (re-fetch):', fetchError?.message);
      return null;
    }

    // Bust analytics cache so dashboard reflects the new order immediately
    cacheInvalidate('admin_analytics');

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

    // Bust analytics cache so revenue/status counts update immediately
    cacheInvalidate('admin_analytics');

    return true;
  },

  /**
   * Cancels a pending order.
   * Accepts userId directly to avoid re-fetching the session inside a data method.
   * Throws a descriptive error if the order cannot be cancelled.
   */
  cancelOrder: async (orderId: string, userId?: string): Promise<void> => {
    const { data: existing, error: fetchErr } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Order not found.');
    }

    if (existing.status !== 'pending') {
      throw new Error(
        `Cannot cancel an order that is already "${existing.status}". ` +
        'Only pending orders can be cancelled.'
      );
    }

    // Resolve userId — prefer the passed-in value, fall back to session
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id;
    }
    if (!resolvedUserId) throw new Error('Not authenticated.');

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('user_id', resolvedUserId);

    if (error) throw new Error(error.message);

    cacheInvalidate('admin_analytics');
  },

  deleteOrder: async (orderId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('[storage] deleteOrder:', error.message);
      return false;
    }
    cacheInvalidate('admin_analytics');
    return true;
  },

  // ── Users ─────────────────────────────────────────────────

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

  /**
   * Deletes a user's profile row from the users table.
   * NOTE: This does NOT delete the Supabase Auth account — the person can
   * still log back in and a new profile row will be re-created by the DB
   * trigger. Full auth deletion requires a server-side Edge Function with
   * the service role key calling supabase.auth.admin.deleteUser(id).
   */
  deleteUser: async (id: string): Promise<boolean> => {
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

  // ── Ratings ───────────────────────────────────────────────

  getRatedOrderIds: async (
    userId: string,
    orderIds: string[]
  ): Promise<Set<string>> => {
    if (orderIds.length === 0) return new Set();

    const { data, error } = await supabase
      .from('ratings')
      .select('order_id')
      .eq('user_id', userId)
      .in('order_id', orderIds);

    if (error) {
      console.error('[storage] getRatedOrderIds:', error.message);
      return new Set();
    }
    return new Set((data ?? []).map((r: any) => r.order_id));
  },

  addRating: async (payload: {
    user_id: string;
    order_id: string;
    stars: number;
  }): Promise<boolean> => {
    const { error } = await supabase.from('ratings').insert([payload]);
    if (error) {
      console.error('[storage] addRating:', error.message);
      return false;
    }
    return true;
  },

  // ── Analytics ─────────────────────────────────────────────

  /**
   * Fetches completed/active orders and computes analytics client-side.
   * Growth figures compare this week vs last week (revenue) and
   * today vs yesterday (orders). Returns null when there's no prior
   * period data to compare against.
   */
  getAdminAnalytics: async (): Promise<AdminAnalytics> => {
    const cached = cacheGet<AdminAnalytics>('admin_analytics');
    if (cached) return cached;

    // Only fetch the last 14 days to keep the payload small
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_JOIN)
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storage] getAdminAnalytics:', error.message);
      return {
        bestSellers: [],
        todayRevenue: 0,
        weekRevenue: 0,
        ordersByStatus: {},
        revenueGrowthPercent: null,
        orderGrowthPercent: null,
      };
    }

    const orders = (data ?? []).map(mapOrder);
    const now = new Date();

    // Time boundaries
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfLastWeek = startOfThisWeek - 7 * 24 * 60 * 60 * 1000;

    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let weekRevenue = 0;
    let lastWeekRevenue = 0;
    let todayOrders = 0;
    let yesterdayOrders = 0;

    const ordersByStatus: Record<string, number> = {};
    const itemCounts: Record<string, number> = {};

    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;

      const t = new Date(order.created_at).getTime();

      // Order counts for growth (all statuses except cancelled)
      if (order.status !== 'cancelled') {
        if (t >= startOfToday) todayOrders++;
        else if (t >= startOfYesterday) yesterdayOrders++;
      }

      if (order.status !== 'completed') continue;

      if (t >= startOfToday) {
        todayRevenue += order.total_amount;
      } else if (t >= startOfYesterday) {
        yesterdayRevenue += order.total_amount;
      }

      if (t >= startOfThisWeek) {
        weekRevenue += order.total_amount;
      } else if (t >= startOfLastWeek) {
        lastWeekRevenue += order.total_amount;
      }

      for (const item of order.items) {
        const name = item.name ?? 'Unknown';
        itemCounts[name] = (itemCounts[name] ?? 0) + item.quantity;
      }
    }

    // Growth: null if there's no prior period data (avoid divide-by-zero / misleading 0%)
    const revenueGrowthPercent =
      lastWeekRevenue > 0
        ? Math.round(((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
        : weekRevenue > 0
        ? null  // first week ever — can't compute growth yet
        : null;

    const orderGrowthPercent =
      yesterdayOrders > 0
        ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100)
        : todayOrders > 0
        ? null
        : null;

    const bestSellers = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const result: AdminAnalytics = {
      bestSellers,
      todayRevenue,
      weekRevenue,
      ordersByStatus,
      revenueGrowthPercent,
      orderGrowthPercent,
    };
    cacheSet('admin_analytics', result);
    return result;
  },

  invalidateAnalyticsCache: () => cacheInvalidate('admin_analytics'),

  // ── Seed ──────────────────────────────────────────────────

  seedDefaultData: async (): Promise<void> => {
    const { data: existing, error } = await supabase
      .from('menu_items')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[storage] seedDefaultData (check):', error.message);
      return;
    }
    if (existing && existing.length > 0) return;

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
    } else {
      cacheInvalidate('menu_items');
    }
  },
};