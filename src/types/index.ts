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

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateAvatar: (uri: string) => Promise<void>;
}
