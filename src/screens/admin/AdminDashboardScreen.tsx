import React, { useRef, useEffect, useCallback, useState, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { storage, AdminAnalytics } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';

type Stats = {
  totalOrders: number;
  activeOrders: number;
  totalUsers: number;
  revenue: number;
};

const INITIAL_STATS: Stats = { totalOrders: 0, activeOrders: 0, totalUsers: 0, revenue: 0 };
const INITIAL_ANALYTICS: AdminAnalytics = {
  bestSellers: [],
  todayRevenue: 0,
  weekRevenue: 0,
  ordersByStatus: {},
};

const TOOL_CARDS = [
  { title: 'Menu Management', description: 'Add, edit, or disable dishes', icon: 'grid' as const, color: theme.colors.accent, route: 'Menu' },
  { title: 'Order Management', description: 'Track and confirm live orders', icon: 'clipboard' as const, color: theme.colors.success, route: 'Orders' },
  { title: 'User Management', description: 'Control staff roles & access', icon: 'users' as const, color: theme.colors.primary, route: 'Users' },
] as const;

export default function AdminDashboardScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [analytics, setAnalytics] = useState<AdminAnalytics>(INITIAL_ANALYTICS);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadStats = useCallback(async () => {
    // Parallel fetch — all three queries fire at once
    const [orders, users, analyticsData] = await Promise.all([
      storage.getOrders(),
      storage.getUsers(),
      storage.getAdminAnalytics(),
    ]);

    const active = orders.filter(
      (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing'
    ).length;
    const revenue = orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.total_amount, 0);

    setStats({ totalOrders: orders.length, activeOrders: active, totalUsers: users.length, revenue });
    setAnalytics(analyticsData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const activeRatio = stats.totalOrders > 0 ? Math.min(stats.activeOrders / 20, 1) : 0;

  const formatRevenue = useCallback((v: number) => {
    if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `₱${(v / 1_000).toFixed(1)}k`;
    return `₱${v.toFixed(0)}`;
  }, []);

  const navigate = useCallback((route: string) => navigation.navigate(route), [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Header row */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Admin Hub</Text>
              <Text style={styles.headerSubtitle}>Local System Management</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
                <Feather name="bell" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, styles.avatarBtn]} onPress={logout}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* KEY METRICS */}
          <Text style={styles.sectionLabel}>KEY METRICS</Text>
          <View style={styles.metricsGrid}>
            <MetricCard icon="shopping-cart" iconColor={theme.colors.accent} label="Total Orders" value={stats.totalOrders.toString()} sub="↑ +12%" subColor={theme.colors.success} index={0} />
            <MetricCard icon="zap" iconColor={theme.colors.primary} label="Active Orders" value={`${stats.activeOrders}/20`} progressRatio={activeRatio} progressColor={theme.colors.primary} index={1} />
            <MetricCard icon="dollar-sign" iconColor={theme.colors.teal} label="Revenue" value={formatRevenue(stats.revenue)} sub="↑ +8%" subColor={theme.colors.success} index={2} />
            <MetricCard icon="users" iconColor={theme.colors.blue} label="Users" value={stats.totalUsers.toString()} sub="↑ +2" subColor={theme.colors.success} index={3} />
          </View>

          {/* MANAGEMENT TOOLS */}
          <Text style={styles.sectionLabel}>MANAGEMENT TOOLS</Text>
          <View style={styles.toolsContainer}>
            {TOOL_CARDS.map((tool, index) => (
              <ToolCard key={tool.route} {...tool} index={index} onPress={() => navigate(tool.route)} />
            ))}
          </View>

          {/* ANALYTICS */}
          <Text style={styles.sectionLabel}>ANALYTICS — LAST 7 DAYS</Text>
          <View style={styles.revenueRow}>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Today</Text>
              <Text style={styles.revenueValue}>{formatRevenue(analytics.todayRevenue)}</Text>
            </View>
            <View style={[styles.revenueCard, styles.revenueCardAccent]}>
              <Text style={styles.revenueLabel}>This Week</Text>
              <Text style={[styles.revenueValue, { color: theme.colors.primary }]}>
                {formatRevenue(analytics.weekRevenue)}
              </Text>
            </View>
          </View>

          {analytics.bestSellers.length > 0 && (
            <View style={styles.bestSellersCard}>
              <View style={styles.bestSellersHeader}>
                <Feather name="trending-up" size={14} color={theme.colors.accent} />
                <Text style={styles.bestSellersTitle}>Best Sellers</Text>
              </View>
              {analytics.bestSellers.map((item, idx) => (
                <View key={item.name} style={styles.bestSellerRow}>
                  <View style={styles.bestSellerRank}>
                    <Text style={styles.bestSellerRankText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.bestSellerName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.bestSellerCount}>{item.count} sold</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Metric Card ───────────────────────────────────────────
const MetricCard: React.FC<{
  icon: any;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  progressRatio?: number;
  progressColor?: string;
  index: number;
}> = memo(({ icon, iconColor, label, value, sub, subColor, progressRatio, progressColor, index }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, delay: index * 100, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (progressRatio !== undefined) {
      Animated.timing(progressAnim, {
        toValue: progressRatio,
        duration: 800,
        delay: 400 + index * 100,
        useNativeDriver: false,
      }).start();
    }
  }, [progressRatio]);

  return (
    <Animated.View style={[styles.metricCard, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: iconColor + '20' }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: iconColor }]}>{value}</Text>
      {sub && <Text style={[styles.metricSub, { color: subColor }]}>{sub}</Text>}
      {progressRatio !== undefined && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: progressColor,
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
});

// ─── Tool Card ─────────────────────────────────────────────
const ToolCard: React.FC<{
  title: string;
  description: string;
  icon: any;
  color: string;
  index: number;
  onPress: () => void;
}> = memo(({ title, description, icon, color, index, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: 200 + index * 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: 200 + index * 100, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn = useCallback(
    () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start(),
    []
  );
  const onPressOut = useCallback(
    () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start(),
    []
  );

  return (
    <Animated.View style={[styles.toolCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }, { scale }] }]}>
      <TouchableOpacity style={styles.toolCardInner} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={[styles.toolIconWrap, { backgroundColor: color + '20' }]}>
          <Feather name={icon} size={22} color={color} />
        </View>
        <View style={styles.toolTextWrap}>
          <Text style={styles.toolTitle}>{title}</Text>
          <Text style={styles.toolDescription}>{description}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingTop: 56, paddingBottom: 24 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xl },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  avatarBtn: { backgroundColor: theme.colors.primary + '25', borderColor: theme.colors.primary + '40' },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: theme.spacing.md, marginTop: theme.spacing.xs },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  metricCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.medium },
  metricIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  metricLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  metricValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  metricSub: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  progressTrack: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginTop: theme.spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  toolsContainer: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  toolCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', ...theme.shadows.small },
  toolCardInner: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.md },
  toolIconWrap: { width: 46, height: 46, borderRadius: theme.borderRadius.medium, alignItems: 'center', justifyContent: 'center' },
  toolTextWrap: { flex: 1 },
  toolTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  toolDescription: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },

  revenueRow: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  revenueCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.small },
  revenueCardAccent: { borderColor: theme.colors.primary + '40' },
  revenueLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  revenueValue: { fontSize: 24, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },

  bestSellersCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, padding: theme.spacing.md, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.small },
  bestSellersHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.md },
  bestSellersTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  bestSellerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 7, borderTopWidth: 1, borderTopColor: theme.colors.border },
  bestSellerRank: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  bestSellerRankText: { fontSize: 11, fontWeight: '800', color: theme.colors.accent },
  bestSellerName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  bestSellerCount: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
});