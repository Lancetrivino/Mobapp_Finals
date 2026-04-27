// ─── Core Domain Types ─────────────────────────────────────
// All fields use snake_case to match Supabase column names exactly.
// Never alias these to camelCase in the data layer.

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  available: boolean;
  created_at?: string;
  updated_at?: string;
}

// OrderItem as stored in Supabase order_items table
export interface OrderItem {
  id?: string;
  order_id?: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  // Populated via join — present when fetched with menu_items(*)
  name?: string;
  created_at?: string;
}

// Order as returned from Supabase (snake_case, no aliases)
export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];       // populated from order_items join
  total_amount: number;
  status: OrderStatus;
  table_number?: number;    // now persisted — was silently dropped before
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

// ─── Auth ──────────────────────────────────────────────────
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateAvatar: (uri: string) => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'name'>>) => Promise<void>;
}

// ─── Cart (local UI state only — never stored directly) ────
export interface CartItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
}