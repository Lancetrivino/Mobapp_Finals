import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Header, Card, Button, StatCard } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { storage } from '../../utils/storage';

export default function UserDashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [orderCount, setOrderCount] = React.useState(0);

  useFocusEffect(
    useCallback(() => {
      loadOrderCount();
    }, [])
  );

  const loadOrderCount = async () => {
    const all = await storage.getOrders();
    const mine = all.filter((o) => o.userId === user?.id);
    setOrderCount(mine.length);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Welcome Header */}
        <Header
          title={`Welcome, ${user?.name}! 👋`}
          subtitle="Enjoy delicious meals"
          icon=""
        />

        {/* User Info Card */}
        <Card>
          <View style={styles.userInfoSection}>
            <View style={styles.userAvatarContainer}>
              <Text style={styles.userAvatar}>👤</Text>
            </View>
            <View style={styles.userDetailsContainer}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {user?.role.charAt(0).toUpperCase() + (user?.role.slice(1) ?? '')}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Stats Section */}
        <Text style={styles.sectionTitle}>Your Activity</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Orders"
            value={orderCount.toString()}
            icon="📋"
            color={theme.colors.primary}
          />
          <StatCard
            label="Account Status"
            value="Active"
            icon="✅"
            color={theme.colors.success}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <Button
            title="🍽️  Browse Menu"
            onPress={() => navigation.navigate('MenuBrowse')}
          />
          <Button
            title="🛒  Place Order"
            onPress={() => navigation.navigate('PlaceOrder')}
            variant="secondary"
          />
          <Button
            title="📋  My Orders"
            onPress={() => navigation.navigate('MyOrders')}
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

  // User Info
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  userAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.small,
  },
  userAvatar: {
    fontSize: 32,
  },
  userDetailsContainer: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  roleBadgeText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
    letterSpacing: -0.3,
  },

  // Actions Container
  actionsContainer: {
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },

  // Logout Section
  logoutSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});