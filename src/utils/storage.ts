import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, MenuItem, Order } from '../types/index';

const KEYS = {
  USER: 'rms_user',
  USERS: 'rms_users',
  MENU_ITEMS: 'rms_menu_items',
  ORDERS: 'rms_orders',
};

export const storage = {
  // ─── Session ───────────────────────────────────────────────
  setUser: async (user: User) => {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (e) {
      console.error('setUser:', e);
    }
  },
  getUser: async (): Promise<User | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('getUser:', e);
      return null;
    }
  },
  removeUser: async () => {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (e) {
      console.error('removeUser:', e);
    }
  },

  // ─── User List ─────────────────────────────────────────────
  getUsers: async (): Promise<User[]> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('getUsers:', e);
      return [];
    }
  },
  setUsers: async (users: User[]) => {
    try {
      await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error('setUsers:', e);
    }
  },

  // ─── Menu Items ────────────────────────────────────────────
  getMenuItems: async (): Promise<MenuItem[]> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.MENU_ITEMS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('getMenuItems:', e);
      return [];
    }
  },
  setMenuItems: async (items: MenuItem[]) => {
    try {
      await AsyncStorage.setItem(KEYS.MENU_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('setMenuItems:', e);
    }
  },

  // ─── Orders ────────────────────────────────────────────────
  getOrders: async (): Promise<Order[]> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('getOrders:', e);
      return [];
    }
  },
  setOrders: async (orders: Order[]) => {
    try {
      await AsyncStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('setOrders:', e);
    }
  },

  // ─── Seed ──────────────────────────────────────────────────
  seedDefaultData: async () => {
    try {
      const users = await storage.getUsers();
      if (users.length === 0) {
        await storage.setUsers([
          {
            id: 'admin-001',
            name: 'Admin',
            email: 'admin@rms.com',
            password: 'admin123',
            role: 'admin',
          },
        ]);
      }

      const menuItems = await storage.getMenuItems();
      if (menuItems.length === 0) {
        await storage.setMenuItems([
          { id: 'm1', name: 'Burger', description: 'Classic beef burger', price: 8.99, category: 'Main Course', available: true },
          { id: 'm2', name: 'Pizza', description: 'Margherita cheese pizza', price: 12.99, category: 'Main Course', available: true },
          { id: 'm3', name: 'Salad', description: 'Fresh garden salad', price: 6.99, category: 'Appetizer', available: true },
          { id: 'm4', name: 'Iced Tea', description: 'Refreshing iced tea', price: 2.99, category: 'Beverage', available: true },
        ]);
      }
    } catch (e) {
      console.error('seedDefaultData:', e);
    }
  },

  clearAll: async () => {
    try {
      await AsyncStorage.multiRemove(Object.values(KEYS));
    } catch (e) {
      console.error('clearAll:', e);
    }
  },
};