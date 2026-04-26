import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Platform, Animated } from 'react-native';
import { theme } from './src/utils/theme';
import { MenuItem } from './src/types/index';
import { Feather } from '@expo/vector-icons';
import { storage } from './src/utils/storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ─── Screens ───────────────────────────────────────────────
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import MenuManagementScreen from './src/screens/admin/MenuManagementScreen';
import OrderManagementScreen from './src/screens/admin/OrderManagementScreen';
import UserManagementScreen from './src/screens/admin/UserManagementScreen';
import AdminProfileScreen from './src/screens/admin/AdminProfileScreen';
import MenuBrowseScreen from './src/screens/user/MenuBrowseScreen';
import PlaceOrderScreen from './src/screens/user/PlaceOrderScreen';
import MyOrdersScreen from './src/screens/user/MyOrdersScreen';
import UserDashboardScreen from './src/screens/user/UserDashboardScreen';

// ─── Param Lists ───────────────────────────────────────────
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  AdminNavigator: undefined;
  UserNavigator: undefined;
};

type AdminTabsParamList = {
  Dashboard: undefined;
  Menu: undefined;
  Orders: undefined;
  Users: undefined;
  AdminProfile: undefined;
};

type UserTabsParamList = {
  MenuBrowse: undefined;
  MyOrders: undefined;
  Profile: undefined;
};

type UserStackParamList = {
  UserTabs: undefined;
  PlaceOrder: { item?: MenuItem; cartItems?: any[]; tableNumber?: string };
};

// ─── Navigator Instances ───────────────────────────────────
const Stack = createNativeStackNavigator<RootStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabsParamList>();
const UserTab = createBottomTabNavigator<UserTabsParamList>();
const UserStack = createNativeStackNavigator<UserStackParamList>();

// ─── Orders Badge Icon ─────────────────────────────────────
function OrdersBadgeIcon({ color, size }: { color: string; size: number }) {
  const [hasPending, setHasPending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const check = async () => {
      const orders = await storage.getOrders();
      setHasPending(orders.some((o) => o.status === 'pending'));
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasPending) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [hasPending]);

  return (
    <View>
      <Feather name="clipboard" size={size} color={color} />
      {hasPending && (
        <Animated.View
          style={{
            position: 'absolute', top: -2, right: -4,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: theme.colors.warning,
            opacity: pulseAnim,
          }}
        />
      )}
    </View>
  );
}

// ─── Shared Tab Bar Style ──────────────────────────────────
const tabBarStyle = {
  backgroundColor: '#0A1628',
  borderTopColor: 'rgba(255,255,255,0.06)',
  borderTopWidth: 1,
  paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  paddingTop: 8,
  height: Platform.OS === 'ios' ? 84 : 64,
};

// ─── Admin Navigator (Bottom Tabs) ─────────────────────────
function AdminNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#4B5563',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
      }}
    >
      <AdminTab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
      <AdminTab.Screen
        name="Menu"
        component={MenuManagementScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
        }}
      />
      <AdminTab.Screen
        name="Orders"
        component={OrderManagementScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <OrdersBadgeIcon color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="Users"
        component={UserManagementScreen}
        options={{
          tabBarLabel: 'Users',
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
        }}
      />
      <AdminTab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </AdminTab.Navigator>
  );
}

// ─── User Tabs ──────────────────────────────────────────────
function UserTabs() {
  return (
    <UserTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#4B5563',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
      }}
    >
      <UserTab.Screen
        name="MenuBrowse"
        component={MenuBrowseScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
      <UserTab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <Feather name="clipboard" size={size} color={color} />,
        }}
      />
      <UserTab.Screen
        name="Profile"
        component={UserDashboardScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </UserTab.Navigator>
  );
}

// ─── User Navigator ─────────────────────────────────────────
function UserNavigator() {
  return (
    // @ts-ignore
    <UserStack.Navigator screenOptions={{ headerShown: false }}>
      <UserStack.Screen name="UserTabs" component={UserTabs} />
      <UserStack.Screen name="PlaceOrder" component={PlaceOrderScreen} />
    </UserStack.Navigator>
  );
}

// ─── App Navigator (Auth Gate) ─────────────────────────────
function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* @ts-ignore */}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : user.role === 'admin' ? (
          <Stack.Screen name="AdminNavigator" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="UserNavigator" component={UserNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Root ──────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
