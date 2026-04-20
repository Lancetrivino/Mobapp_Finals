import { supabase } from '../lib/supabase';
import { User, MenuItem, Order, OrderItem } from '../types/index';

export const storage = {
  // ─── Menu Items ────────────────────────────────────────────
  getMenuItems: async (): Promise<MenuItem[]> => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getMenuItems:', e);
      return [];
    }
  },

  setMenuItems: async (items: MenuItem[]) => {
    try {
      // This would typically be used by admin to update menu items
      // For now, we'll handle individual operations
      console.log('setMenuItems called with', items.length, 'items');
    } catch (e) {
      console.error('setMenuItems:', e);
    }
  },

  addMenuItem: async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem | null> => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('addMenuItem:', e);
      return null;
    }
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('updateMenuItem:', e);
      return null;
    }
  },

  deleteMenuItem: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('deleteMenuItem:', e);
      return false;
    }
  },

  // ─── Orders ────────────────────────────────────────────────
  getOrders: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Order interface
      return (data || []).map(order => ({
        ...order,
        userId: order.user_id,
        totalAmount: order.total_amount,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at),
        items: order.order_items?.map((item: any) => ({
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          price: item.price,
        })) || [],
      }));
    } catch (e) {
      console.error('getOrders:', e);
      return [];
    }
  },

  getUserOrders: async (userId: string): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(order => ({
        ...order,
        userId: order.user_id,
        totalAmount: order.total_amount,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at),
        items: order.order_items?.map((item: any) => ({
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          price: item.price,
        })) || [],
      }));
    } catch (e) {
      console.error('getUserOrders:', e);
      return [];
    }
  },

  createOrder: async (userId: string, items: OrderItem[], totalAmount: number): Promise<Order | null> => {
    try {
      // Start a transaction-like operation
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: userId,
          total_amount: totalAmount,
          status: 'pending',
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Add order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return {
        ...orderData,
        userId: orderData.user_id,
        totalAmount: orderData.total_amount,
        createdAt: new Date(orderData.created_at),
        updatedAt: new Date(orderData.updated_at),
        items,
      };
    } catch (e) {
      console.error('createOrder:', e);
      return null;
    }
  },

  updateOrderStatus: async (orderId: string, status: Order['status']): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('updateOrderStatus:', e);
      return false;
    }
  },

  // ─── Users (for admin purposes) ────────────────────────────
  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getUsers:', e);
      return [];
    }
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('updateUser:', e);
      return null;
    }
  },

  // ─── Seed ──────────────────────────────────────────────────
  seedDefaultData: async () => {
    try {
      // Check if we have menu items
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id')
        .limit(1);

      if (menuError) throw menuError;

      if (!menuItems || menuItems.length === 0) {
        // Seed default menu items
        const defaultItems = [
          {
            name: 'Burger',
            description: 'Classic beef burger with lettuce, tomato, and cheese',
            price: 8.99,
            category: 'Main Course',
            available: true,
          },
          {
            name: 'Margherita Pizza',
            description: 'Traditional pizza with tomato sauce, mozzarella, and basil',
            price: 12.99,
            category: 'Main Course',
            available: true,
          },
          {
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with Caesar dressing and croutons',
            price: 6.99,
            category: 'Appetizer',
            available: true,
          },
          {
            name: 'Iced Tea',
            description: 'Refreshing iced tea with lemon',
            price: 2.99,
            category: 'Beverage',
            available: true,
          },
          {
            name: 'Chocolate Cake',
            description: 'Rich chocolate cake with vanilla frosting',
            price: 5.99,
            category: 'Dessert',
            available: true,
          },
        ];

        const { error: seedError } = await supabase
          .from('menu_items')
          .insert(defaultItems);

        if (seedError) throw seedError;
      }
    } catch (e) {
      console.error('seedDefaultData:', e);
    }
  },

  // ─── Legacy methods (for backward compatibility) ───────────
  setUser: async (user: User) => {
    // This is now handled by Supabase auth
    console.log('setUser is now handled by Supabase auth');
  },

  getUser: async (): Promise<User | null> => {
    // This is now handled by Supabase auth
    console.log('getUser is now handled by Supabase auth');
    return null;
  },

  removeUser: async () => {
    // This is now handled by Supabase auth
    console.log('removeUser is now handled by Supabase auth');
  },

  setUsers: async (users: User[]) => {
    // Admin operations should use individual methods
    console.log('setUsers is deprecated, use individual user operations');
  },

  setOrders: async (orders: Order[]) => {
    // Orders should be managed individually
    console.log('setOrders is deprecated, use individual order operations');
  },

  clearAll: async () => {
    // Not applicable with Supabase
    console.log('clearAll is not applicable with Supabase backend');
  },
};