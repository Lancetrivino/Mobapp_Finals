import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Modal,
  Alert,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { theme } from '../../utils/theme';
import { Order } from '../../types/index';
import { storage } from '../../utils/storage';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../components/UIComponents';

const STATUS_FLOW: Order['status'][] = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  pending: { color: theme.colors.warning, label: 'Pending', icon: 'clock' },
  confirmed: { color: theme.colors.blue, label: 'Confirmed', icon: 'check' },
  preparing: { color: theme.colors.accent, label: 'Preparing', icon: 'zap' },
  ready: { color: theme.colors.success, label: 'Ready', icon: 'check-circle' },
  completed: { color: '#27AE60', label: 'Served', icon: 'check-circle' },
  cancelled: { color: theme.colors.error, label: 'Cancelled', icon: 'x-circle' },
};

export default function OrderManagementScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadOrders();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const data = await storage.getOrders();
    setOrders([...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  };

  const advanceStatus = async (order: Order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return;

    const nextStatus = STATUS_FLOW[idx + 1];
    const success = await storage.updateOrderStatus(order.id, nextStatus);

    if (success) {
      if (detailOrder?.id === order.id) setDetailOrder({ ...order, status: nextStatus });
      loadOrders();
    }
  };

  const cancelOrder = async (order: Order) => {
    Alert.alert('Cancel Order', `Cancel Order #${order.id.slice(-6)}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          const success = await storage.updateOrderStatus(order.id, 'cancelled');
          if (success) {
            setDetailOrder(null);
            loadOrders();
          }
        },
      },
    ]);
  };

  const deleteOrder = async (order: Order) => {
    Alert.alert('Delete Order', `Permanently delete #${order.id.slice(-6)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const all = await storage.getOrders();
          await storage.setOrders(all.filter((o) => o.id !== order.id));
          setDetailOrder(null);
          loadOrders();
        },
      },
    ]);
  };

  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Orders</Text>
          <Text style={styles.headerSub}>Manage and confirm table orders</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.emptyState}>
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.emptyText}>Loading orders...</Text>
              </Animated.View>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="clipboard" size={32} color={theme.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptyText}>Live orders will appear here.</Text>
            </View>
          ) : (
            orders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                onAdvance={() => advanceStatus(order)}
                onDelete={() => deleteOrder(order)}
                timeAgo={timeAgo(new Date(order.created_at))}
              />
            ))
          )}
        </ScrollView>
      </Animated.View>

      {/* Detail Modal */}
      <Modal visible={!!detailOrder} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {detailOrder && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Order #{detailOrder.id.slice(-6)}</Text>
                  <TouchableOpacity onPress={() => setDetailOrder(null)}>
                    <Feather name="x" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (STATUS_CONFIG[detailOrder.status]?.color || theme.colors.gray) + '25' },
                  ]}
                >
                  <Feather
                    name={(STATUS_CONFIG[detailOrder.status]?.icon || 'circle') as any}
                    size={14}
                    color={STATUS_CONFIG[detailOrder.status]?.color || theme.colors.gray}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: STATUS_CONFIG[detailOrder.status]?.color || theme.colors.gray },
                    ]}
                  >
                    {STATUS_CONFIG[detailOrder.status]?.label || detailOrder.status}
                  </Text>
                </View>

                <Text style={styles.modalSection}>Table: {(detailOrder as any).tableNumber || 'N/A'}</Text>

                <Text style={styles.modalSection}>Items</Text>
                {detailOrder.items.map((it, idx) => (
                  <View key={idx} style={styles.detailItemRow}>
                    <Text style={styles.detailItemText}>
                      {idx + 1}x item · ₱{it.price.toFixed(2)}
                    </Text>
                    <Text style={styles.detailItemPrice}>₱{(it.quantity * it.price).toFixed(2)}</Text>
                  </View>
                ))}

                <View style={styles.detailTotal}>
                  <Text style={styles.detailTotalLabel}>Total</Text>
                  <Text style={styles.detailTotalValue}>₱{detailOrder.total_amount.toFixed(2)}</Text>
                </View>

                <View style={styles.modalActions}>
                  {detailOrder.status !== 'completed' && detailOrder.status !== 'cancelled' && (
                    <Button title="Advance Status" onPress={() => advanceStatus(detailOrder)} variant="success" />
                  )}
                  {detailOrder.status !== 'cancelled' && detailOrder.status !== 'completed' && (
                    <Button title="Cancel Order" onPress={() => cancelOrder(detailOrder)} variant="danger" />
                  )}
                  <Button title="Close" onPress={() => setDetailOrder(null)} variant="outline" />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Order Card ────────────────────────────────────────────
const OrderCard: React.FC<{
  order: Order;
  index: number;
  onAdvance: () => void;
  onDelete: () => void;
  timeAgo: string;
}> = ({ order, index, onAdvance, onDelete, timeAgo }) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 80,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cfg = STATUS_CONFIG[order.status] || { color: theme.colors.gray, label: order.status, icon: 'circle' };
  const tableNum = (order as any).tableNumber;
  const canAdvance = order.status !== 'completed' && order.status !== 'cancelled';
  const isCompleted = order.status === 'completed' || order.status === 'cancelled';

  return (
    <Animated.View
      style={[
        styles.orderCard,
        isCompleted && styles.orderCardDim,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Card Header */}
      <View style={styles.orderCardHeader}>
        <View style={styles.orderCardLeft}>
          {tableNum && (
            <View style={styles.tableBadge}>
              <Text style={styles.tableBadgeText}>TABLE {tableNum.toString().padStart(2, '0')}</Text>
            </View>
          )}
          <Text style={styles.orderIdText}>#{order.id.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={styles.orderCardRight}>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.orderItemsSection}>
        {order.items.map((item, idx) => (
          <View key={idx} style={styles.orderItemRow}>
            <Text style={styles.orderItemName}>
              {item.quantity}x Item #{idx + 1}
            </Text>
            <Text style={styles.orderItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.orderActions}>
        {canAdvance ? (
          <>
            <TouchableOpacity style={styles.confirmBtn} onPress={onAdvance} activeOpacity={0.8}>
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={styles.confirmBtnText}>
                {order.status === 'pending' ? 'Confirm Order' :
                  order.status === 'confirmed' ? 'Start Preparing' :
                    order.status === 'preparing' ? 'Mark Ready' : 'Mark Served'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
              <Feather name="trash-2" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.completedRow}>
            <View style={[styles.completedBadge, { backgroundColor: cfg.color + '20' }]}>
              <Feather name={cfg.icon as any} size={14} color={cfg.color} />
              <Text style={[styles.completedText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
              <Feather name="trash-2" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 24,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  orderCardDim: {
    opacity: 0.7,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  orderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  orderCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tableBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D1B2A',
    letterSpacing: 0.5,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  timeAgo: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },

  orderItemsSection: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },

  orderActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.success,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.medium,
    ...theme.shadows.small,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  completedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.medium,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSection: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailItemText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  detailTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  detailTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  modalActions: {
    gap: theme.spacing.sm,
  },
});
