import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../utils/theme';
import { storage } from '../../utils/storage';
import { Feather } from '@expo/vector-icons';

const QUICK_ACTIONS = [
  { label: 'Menu Management', icon: 'book-open' as const, route: 'Menu', color: theme.colors.primary },
  { label: 'Order Management', icon: 'clipboard' as const, route: 'Orders', color: theme.colors.accent },
  { label: 'User Management', icon: 'users' as const, route: 'Users', color: theme.colors.teal },
];

export default function AdminProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalMenuItems, setTotalMenuItems] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(avatarScaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    const [orders, menu, users] = await Promise.all([
      storage.getOrders(),
      storage.getMenuItems(),
      storage.getUsers(),
    ]);
    setTotalOrders(orders.length);
    setTotalMenuItems(menu.length);
    setTotalUsers(users.length);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Header bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Admin Profile</Text>
        <View style={styles.adminBadge}>
          <Feather name="shield" size={13} color={theme.colors.primary} />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.avatarWrap, { transform: [{ scale: avatarScaleAnim }] }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.adminRingBadge}>
                <Feather name="shield" size={12} color="#0D1B2A" />
              </View>
            </Animated.View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>ADMIN ROLE</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatPill value={totalOrders.toString()} label="ORDERS" index={0} />
            <View style={styles.statDivider} />
            <StatPill value={totalMenuItems.toString()} label="MENU" index={1} />
            <View style={styles.statDivider} />
            <StatPill value={totalUsers.toString()} label="USERS" index={2} />
          </View>

          {/* Quick Nav */}
          <Text style={styles.sectionLabel}>QUICK NAVIGATION</Text>
          <View style={styles.actionsCard}>
            {QUICK_ACTIONS.map((action, index) => (
              <ActionRow
                key={action.label}
                {...action}
                index={index}
                isLast={index === QUICK_ACTIONS.length - 1}
                onPress={() => navigation.navigate(action.route)}
              />
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={18} color={theme.colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Stat Pill ─────────────────────────────────────────────
const StatPill: React.FC<{ value: string; label: string; index: number }> = ({ value, label, index }) => {
  const countAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 120, useNativeDriver: true }),
      Animated.spring(countAnim, { toValue: 1, delay: index * 120, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statPill, { opacity: opacityAnim, transform: [{ scale: countAnim }] }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

// ─── Action Row ────────────────────────────────────────────
const ActionRow: React.FC<{
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  index: number;
  isLast: boolean;
  onPress: () => void;
}> = ({ label, icon, color, index, isLast, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: 200 + index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: 200 + index * 80, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View
      style={[
        styles.actionRow,
        !isLast && styles.actionRowBorder,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }, { scale }] },
      ]}
    >
      <TouchableOpacity
        style={styles.actionRowInner}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: color + '20' }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
        <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
  },
  topBarTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  adminBadgeText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary, letterSpacing: 0.8 },
  scrollContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: theme.colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: theme.colors.primary + '60',
    ...theme.shadows.medium,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: theme.colors.primary },
  adminRingBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.colors.background,
  },
  userName: { fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3, marginBottom: 4 },
  userEmail: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 },
  roleBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    backgroundColor: theme.colors.primary + '25',
    borderColor: theme.colors.primary + '40',
  },
  roleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: theme.colors.primary },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textMuted,
    letterSpacing: 1.4, textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
  },

  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  actionRow: {},
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 16,
  },
  actionIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.error + '15',
    borderRadius: theme.borderRadius.large,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: theme.colors.error },
});
