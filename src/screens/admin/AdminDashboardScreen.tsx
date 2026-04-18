import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Header, Button, StatCard } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    setLoading(true);
    const [orders, users] = await Promise.all([storage.getOrders(), storage.getUsers()]);
    const pending = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing').length;
    const revenue = orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    setStats({
      totalOrders: orders.length,
      pendingOrders: pending,
      totalUsers: users.length,
      revenue,
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Welcome Header */}
        <Header
          title={`Admin Dashboard 👨‍💼`}
          subtitle={`Welcome back, ${user?.name}`}
        />

        {/* Stats Cards */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Orders"
            value={stats.totalOrders.toString()}
            icon="📋"
            color={theme.colors.primary}
          />
          <StatCard
            label="Active Orders"
            value={stats.pendingOrders.toString()}
            icon="⏳"
            color={theme.colors.warning}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toString()}
            icon="👥"
            color={theme.colors.secondary}
          />
          <StatCard
            label="Revenue"
            value={`₱${stats.revenue.toFixed(0)}`}
            icon="💰"
            color={theme.colors.success}
          />
        </View>

        {/* Management Section */}
        <Text style={styles.sectionTitle}>Management Tools</Text>
        <View style={styles.actionButtons}>
          <Button
            title="🍽️  Menu Management"
            onPress={() => navigation.navigate('Menu')}
          />
          <Button
            title="📋  Order Management"
            onPress={() => navigation.navigate('Orders')}
            variant="secondary"
          />
          <Button
            title="👥  User Management"
            onPress={() => navigation.navigate('Users')}
            variant="success"
          />
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <Button
            title="🚪 Logout"
            onPress={handleLogout}
            variant="outline"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },

  // Action Buttons
  actionButtons: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },

  // Logout Section
  logoutSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});