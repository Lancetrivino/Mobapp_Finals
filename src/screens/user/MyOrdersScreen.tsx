import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { theme } from '../../utils/theme';
import { Order } from '../../types/index';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../components/UIComponents';

type ExtOrder = Order & { tableNumber?: string; notes?: string };

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Feather.glyphMap }> = {
  pending: { color: theme.colors.warning, label: 'Pending', icon: 'clock' },
  confirmed: { color: theme.colors.blue, label: 'Confirmed', icon: 'check' },
  preparing: { color: theme.colors.accent, label: 'In Preparation', icon: 'zap' },
  ready: { color: theme.colors.success, label: 'Ready', icon: 'check-circle' },
  completed: { color: theme.colors.success, label: 'Served', icon: 'check-circle' },
  cancelled: { color: theme.colors.error, label: 'Cancelled', icon: 'x-circle' },
};

export default function MyOrdersScreen({ navigation }: any) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ExtOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<ExtOrder | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadOrders);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    return unsubscribe;
  }, [navigation]);

  const loadOrders = async () => {
    if (!user?.id) return;

    setLoading(true);
    const userOrders = await storage.getUserOrders(user.id);
    setOrders(userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  };

  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const historyOrders = orders.filter((o) => o.status === 'completed' || o.status === 'cancelled');

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>{orders.length} order{orders.length !== 1 ? 's' : ''} total</Text>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="shopping-bag" size={32} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>Browse the menu and place your first order.</Text>
            <Button title="Browse Menu" onPress={() => navigation.navigate('MenuBrowse')} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ACTIVE ORDER</Text>
                {activeOrders.map((order, index) => (
                  <ActiveOrderCard
                    key={order.id}
                    order={order}
                    index={index}
                    onPress={() => setDetailOrder(order)}
                  />
                ))}
              </>
            )}

            {/* Order History */}
            {historyOrders.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ORDER HISTORY</Text>
                {historyOrders.map((order, index) => (
                  <HistoryOrderRow
                    key={order.id}
                    order={order}
                    index={index}
                    formatDate={formatDate}
                    onPress={() => setDetailOrder(order)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* Detail Modal */}
      <Modal visible={!!detailOrder} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {detailOrder && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Order #{detailOrder.id.slice(-6).toUpperCase()}</Text>
                  <TouchableOpacity onPress={() => setDetailOrder(null)}>
                    <Feather name="x" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Status */}
                {(() => {
                  const cfg = STATUS_CONFIG[detailOrder.status] || { color: theme.colors.gray, label: detailOrder.status, icon: 'circle' as const };
                  return (
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                      <Feather name={cfg.icon} size={14} color={cfg.color} />
                      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  );
                })()}

                {detailOrder.tableNumber && (
                  <Text style={styles.modalMeta}>Table {detailOrder.tableNumber}</Text>
                )}

                <Text style={styles.modalSectionLabel}>Items</Text>
                {detailOrder.items.map((it, idx) => (
                  <View key={idx} style={styles.detailRow}>
                    <Text style={styles.detailItemText}>{idx + 1}x Item · ₱{it.price.toFixed(2)}</Text>
                    <Text style={styles.detailItemPrice}>₱{(it.quantity * it.price).toFixed(2)}</Text>
                  </View>
                ))}

                {detailOrder.notes ? (
                  <>
                    <Text style={styles.modalSectionLabel}>Notes</Text>
                    <Text style={styles.modalMeta}>{detailOrder.notes}</Text>
                  </>
                ) : null}

                <View style={styles.modalTotal}>
                  <Text style={styles.modalTotalLabel}>Total</Text>
                  <Text style={styles.modalTotalValue}>₱{detailOrder.total_amount.toFixed(2)}</Text>
                </View>

                <Button title="Close" onPress={() => setDetailOrder(null)} variant="outline" />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Active Order Card ─────────────────────────────────────
const ActiveOrderCard: React.FC<{ order: ExtOrder; index: number; onPress: () => void }> = ({
  order, index, onPress,
}) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 80, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();

    // Pulse the border for active orders
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <Animated.View style={[styles.activeCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Header row */}
      <View style={styles.activeCardHeader}>
        <View style={[styles.activeStatusRow, { backgroundColor: cfg.color + '20' }]}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <Feather name={cfg.icon} size={14} color={cfg.color} />
          </Animated.View>
          <Text style={[styles.activeStatusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.activeOrderId}>#{order.id.slice(-6).toUpperCase()}</Text>
      </View>

      {/* Items */}
      <View style={styles.activeItemsList}>
        {order.items.map((it, idx) => (
          <View key={idx} style={styles.activeItemRow}>
            <Text style={styles.activeItemName}>Item #{idx + 1}</Text>
            <Text style={styles.activeItemPrice}>₱{(it.price * it.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.activeCardFooter}>
        {order.tableNumber && (
          <Text style={styles.activeTableText}>Table {order.tableNumber}</Text>
        )}
        <Text style={styles.activeTotalText}>₱{order.total_amount.toFixed(2)}</Text>
      </View>

      {/* Help button */}
      <TouchableOpacity style={styles.helpBtn} onPress={onPress} activeOpacity={0.8}>
        <Feather name="help-circle" size={15} color={theme.colors.textSecondary} />
        <Text style={styles.helpBtnText}>Help with Order</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── History Row ───────────────────────────────────────────
const HistoryOrderRow: React.FC<{
  order: ExtOrder;
  index: number;
  formatDate: (d: Date) => string;
  onPress: () => void;
}> = ({ order, index, formatDate, onPress }) => {
  const slideAnim = useRef(new Animated.Value(16)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 60, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const isCompleted = order.status === 'completed';

  return (
    <Animated.View style={[styles.historyRow, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.historyIcon, { backgroundColor: isCompleted ? theme.colors.successLight : theme.colors.errorLight }]}>
        <Feather
          name={isCompleted ? 'check-circle' : 'x-circle'}
          size={20}
          color={isCompleted ? theme.colors.success : theme.colors.error}
        />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyName}>
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.historyMeta}>
          {formatDate(new Date(order.created_at))} · ₱{order.total_amount.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity style={styles.reorderBtn} onPress={onPress} activeOpacity={0.75}>
        <Feather name="refresh-cw" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.lg,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' },
  scrollContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 24 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textMuted,
    letterSpacing: 1.4, textTransform: 'uppercase',
    marginBottom: theme.spacing.md, marginTop: theme.spacing.xs,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: theme.spacing.xl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },

  // Active card
  activeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary + '60',
    ...theme.shadows.medium,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
  },
  activeStatusText: { fontSize: 12, fontWeight: '700' },
  activeOrderId: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  activeItemsList: { gap: 6, marginBottom: theme.spacing.sm },
  activeItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeItemName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  activeItemPrice: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  activeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  activeTableText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  activeTotalText: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helpBtnText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },

  // History row
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    ...theme.shadows.small,
  },
  historyIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  historyMeta: { fontSize: 12, color: theme.colors.textMuted },
  reorderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surfaceHigh,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },

  // Modal
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg, paddingBottom: 40,
    borderTopWidth: 1, borderColor: theme.colors.border,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: theme.colors.borderStrong,
    borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  modalMeta: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  modalSectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  detailItemText: { fontSize: 14, color: theme.colors.textSecondary },
  detailItemPrice: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  modalTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  modalTotalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  modalTotalValue: { fontSize: 22, fontWeight: '800', color: theme.colors.primary },
});
