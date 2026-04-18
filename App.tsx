import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { theme } from './src/utils/theme';
import { MenuItem } from './src/types/index';

// ─── Screens ───────────────────────────────────────────────
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import MenuManagementScreen from './src/screens/admin/MenuManagementScreen';
import OrderManagementScreen from './src/screens/admin/OrderManagementScreen';
import UserManagementScreen from './src/screens/admin/UserManagementScreen';
import MenuBrowseScreen from './src/screens/user/MenuBrowseScreen';
import PlaceOrderScreen from './src/screens/user/PlaceOrderScreen';
import MyOrdersScreen from './src/screens/user/MyOrdersScreen';
import UserDashboardScreen from './src/screens/user/UserDashboardScreen';

// ─── Param Lists ───────────────────────────────────────────
type RootStackParamList = {
  Login: undefined;
  AdminNavigator: undefined;
  UserNavigator: undefined;
};

type AdminTabsParamList = {
  Dashboard: undefined;
  Menu: undefined;
  Orders: undefined;
  Users: undefined;
};

type UserTabsParamList = {
  MenuBrowse: undefined;
  MyOrders: undefined;
  Profile: undefined;
};

type UserStackParamList = {
  UserTabs: undefined;
  PlaceOrder: { item?: MenuItem };
};

// ─── Navigator Instances ───────────────────────────────────
const Stack = createNativeStackNavigator<RootStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabsParamList>();
const UserTab = createBottomTabNavigator<UserTabsParamList>();
const UserStack = createNativeStackNavigator<UserStackParamList>();

// ─── Tab Helper ────────────────────────────────────────────
const tabIcon = (icon: string, label: string) => ({
  tabBarLabel: label,
  tabBarIcon: ({ color }: { color: string }) => (
    <Text style={{ fontSize: 20, color }}>{icon}</Text>
  ),
  tabBarActiveTintColor: theme.colors.primary,
  tabBarInactiveTintColor: theme.colors.gray,
  headerShown: false,
});

// ─── Admin Navigator (Bottom Tabs) ─────────────────────────
function AdminNavigator() {
  return (
    <AdminTab.Navigator screenOptions={{ headerShown: false }}>
      <AdminTab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={tabIcon('🏠', 'Dashboard')}
      />
      <AdminTab.Screen
        name="Menu"
        component={MenuManagementScreen}
        options={tabIcon('🍽️', 'Menu')}
      />
      <AdminTab.Screen
        name="Orders"
        component={OrderManagementScreen}
        options={tabIcon('📋', 'Orders')}
      />
      <AdminTab.Screen
        name="Users"
        component={UserManagementScreen}
        options={tabIcon('👥', 'Users')}
      />
    </AdminTab.Navigator>
  );
}

// ─── User Tabs (Bottom Tabs) ────────────────────────────────
function UserTabs() {
  return (
    <UserTab.Navigator screenOptions={{ headerShown: false }}>
      <UserTab.Screen
        name="MenuBrowse"
        component={MenuBrowseScreen}
        options={tabIcon('🍽️', 'Menu')}
      />
      <UserTab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={tabIcon('📋', 'My Orders')}
      />
      <UserTab.Screen
        name="Profile"
        component={UserDashboardScreen}
        options={tabIcon('👤', 'Profile')}
      />
    </UserTab.Navigator>
  );
}

// ─── User Navigator (Stack over Tabs) ──────────────────────
// PlaceOrder is a stack screen so it can receive { item } params
// from MenuBrowseScreen via navigation.navigate('PlaceOrder', { item })
function UserNavigator() {
  return (
    // @ts-ignore - React Navigation v6 + Expo SDK 54 TS type compatibility
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
      {/* @ts-ignore - React Navigation v6 + Expo SDK 54 TS type compatibility */}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not logged in — show Login only
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'admin' ? (
          // Admin — show Admin tabs
          <Stack.Screen name="AdminNavigator" component={AdminNavigator} />
        ) : (
          // User — show User tabs + PlaceOrder stack
          <Stack.Screen name="UserNavigator" component={UserNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Root ──────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});