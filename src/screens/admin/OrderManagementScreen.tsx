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
  Dimensions,
} from 'react-native';
import { theme } from '../../utils/theme';
import { ORDER_STATUS_CONFIG as STATUS_CONFIG } from '../../utils/orderStatus';
import { Order } from '../../types/index';
import { storage } from '../../utils/storage';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../components/UIComponents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.72;

const STATUS_FLOW: Order['status'][] = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Pending', color: theme.colors.warning, statuses: ['pending'] as Order['status'][] },
  { key: 'preparing', label: 'Preparing', color: theme.colors.blue, statuses: ['confirmed', 'preparing'] as Order['status'][] },
  { key: 'ready', label: 'Ready', color: theme.colors.success, statuses: ['ready'] as Order['status'][] },
];

export default function OrderManagementScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadOrders();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { loadOrders(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
          if (success) { setDetailOrder(null); loadOrders(); }
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
          const { error } = await supabase.from('orders').delete().eq('id', order.id);
          if (!error) { setDetailOrder(null); loadOrders(); }
        },
      },
    ]);
  };

  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Orders</Text>
          <Text style={styles.headerSub}>Manage and confirm table orders</Text>
        </View>

        {loading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanScroll}>
            {KANBAN_COLUMNS.map((col) => (
              <View key={col.key} style={styles.column}>
                <View style={[styles.columnHeader, { borderBottomColor: col.color }]}>
                  <Text style={[styles.columnTitle, { color: col.color }]}>{col.label}</Text>
                  <View style={[styles.columnBadge, { backgroundColor: col.color + '25' }]}>
                    <Text style={[styles.columnBadgeText, { color: col.color }]}>—</Text>
                  </View>
                </View>
                {[...Array(2)].map((_, i) => <SkeletonOrderCard key={i} />)}
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanScroll}>
            {KANBAN_COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => col.statuses.includes(o.status));
              return (
                <View key={col.key} style={styles.column}>
                  <View style={[styles.columnHeader, { borderBottomColor: col.color }]}>
                    <Text style={[styles.columnTitle, { color: col.color }]}>{col.label}</Text>
                    <View style={[styles.columnBadge, { backgroundColor: col.color + '25' }]}>
                      <Text style={[styles.columnBadgeText, { color: col.color }]}>{colOrders.length}</Text>
                    </View>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {colOrders.length === 0 ? (
                      <View style={styles.columnEmpty}>
                        <Feather name="inbox" size={24} color={theme.colors.textMuted} />
                        <Text style={styles.columnEmptyText}>No orders</Text>
                      </View>
                    ) : (
                      colOrders.map((order, index) => (
                        <KanbanCard
                          key={order.id}
                          order={order}
                          index={index}
                          colColor={col.color}
                          onAdvance={() => advanceStatus(order)}
                          onTap={() => setDetailOrder(order)}
                          timeAgo={timeAgo(new Date(order.created_at))}
                        />
                      ))
                    )}
                  </ScrollView>
                </View>
              );
            })}
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
                  <Text style={styles.modalTitle}>Order #{detailOrder.id.slice(-6)}</Text>
                  <TouchableOpacity onPress={() => setDetailOrder(null)}>
                    <Feather name="x" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: (STATUS_CONFIG[detailOrder.status]?.color || theme.colors.textMuted) + '25' }]}>
                  <Feather name={(STATUS_CONFIG[detailOrder.status]?.icon || 'circle') as any} size={14} color={STATUS_CONFIG[detailOrder.status]?.color || theme.colors.textMuted} />
                  <Text style={[styles.statusBadgeText, { color: STATUS_CONFIG[detailOrder.status]?.color || theme.colors.textMuted }]}>
                    {STATUS_CONFIG[detailOrder.status]?.label || detailOrder.status}
                  </Text>
                </View>

                {detailOrder.table_number && (
                  <Text style={styles.modalSection}>Table: {detailOrder.table_number}</Text>
                )}
                {detailOrder.notes && (
                  <Text style={styles.modalSection}>Notes: {detailOrder.notes}</Text>
                )}
                <Text style={styles.modalSection}>Items</Text>
                {detailOrder.items.map((it, idx) => (
                  <View key={idx} style={styles.detailItemRow}>
                    <Text style={styles.detailItemText}>{it.quantity}× {it.name || `Item #${idx + 1}`}</Text>
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
                  <Button title="Delete" onPress={() => deleteOrder(detailOrder)} variant="outline" />
                  <Button title="Close" onPress={() => setDetailOrder(null)} variant="secondary" />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Kanban Card ───────────────────────────────────────────
const KanbanCard: React.FC<{
  order: Order;
  index: number;
  colColor: string;
  onAdvance: () => void;
  onTap: () => void;
  timeAgo: string;
}> = ({ order, index, colColor, onAdvance, onTap, timeAgo }) => {
  const slideX = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const entryY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.spring(entryY, { toValue: 0, delay: index * 80, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAdvance = () => {
    Animated.timing(slideX, { toValue: COLUMN_WIDTH + 40, duration: 280, useNativeDriver: true }).start(() => {
      slideX.setValue(0);
      opacityAnim.setValue(0);
      onAdvance();
    });
  };

  const tableNum = (order as any).tableNumber;
  const canAdvance = order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'ready';

  return (
    <Animated.View style={[styles.kanbanCard, { opacity: opacityAnim, transform: [{ translateY: entryY }, { translateX: slideX }], borderLeftColor: colColor }]}>
      <TouchableOpacity onPress={onTap} activeOpacity={0.85}>
        <View style={styles.kanbanCardHeader}>
          {tableNum && (
            <View style={[styles.tableBadge, { backgroundColor: colColor + '25' }]}>
              <Text style={[styles.tableBadgeText, { color: colColor }]}>T-{tableNum.toString().padStart(2, '0')}</Text>
            </View>
          )}
          <Text style={styles.orderIdText}>#{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.timeAgoText}>{timeAgo}</Text>
        </View>

        <View style={styles.kanbanItems}>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.kanbanItemRow}>
              <Text style={styles.kanbanItemName} numberOfLines={1}>{item.quantity}× {item.name || `Item #${idx + 1}`}</Text>
              <Text style={styles.kanbanItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.kanbanFooter}>
          <Text style={styles.kanbanTotal}>₱{order.total_amount.toFixed(2)}</Text>
        </View>
      </TouchableOpacity>

      {canAdvance && (
        <TouchableOpacity style={[styles.advanceBtn, { backgroundColor: colColor }]} onPress={handleAdvance} activeOpacity={0.8}>
          <Feather name="arrow-right" size={14} color="#fff" />
          <Text style={styles.advanceBtnText}>
            {order.status === 'pending' ? 'Confirm' : 'Mark Ready'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ─── Skeleton Card ─────────────────────────────────────────
const SkeletonOrderCard: React.FC = () => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <Animated.View style={[styles.kanbanCard, { opacity, borderLeftColor: theme.colors.border }]}>
      <View style={{ height: 12, backgroundColor: theme.colors.surfaceHigh, borderRadius: 6, marginBottom: 8, width: '60%' }} />
      <View style={{ height: 10, backgroundColor: theme.colors.surfaceHigh, borderRadius: 6, marginBottom: 6 }} />
      <View style={{ height: 10, backgroundColor: theme.colors.surfaceHigh, borderRadius: 6, width: '80%' }} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 3, fontWeight: '500' },

  kanbanScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 24,
    gap: theme.spacing.md,
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    maxHeight: '88%',
    ...theme.shadows.small,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 2,
  },
  columnTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  columnBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  columnBadgeText: { fontSize: 12, fontWeight: '800' },
  columnEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  columnEmptyText: { fontSize: 12, color: theme.colors.textMuted },

  kanbanCard: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 3,
    ...theme.shadows.small,
  },
  kanbanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  tableBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  tableBadgeText: { fontSize: 10, fontWeight: '800' },
  orderIdText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, flex: 1 },
  timeAgoText: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
  kanbanItems: { gap: 4, marginBottom: 8 },
  kanbanItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  kanbanItemName: { fontSize: 12, color: theme.colors.text, fontWeight: '600', flex: 1 },
  kanbanItemPrice: { fontSize: 12, color: theme.colors.text, fontWeight: '700' },
  kanbanFooter: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6 },
  kanbanTotal: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.small,
    marginTop: 8,
  },
  advanceBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

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
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: theme.borderRadius.full, marginBottom: theme.spacing.md,
  },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  modalSection: {
    fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600',
    marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs,
  },
  detailItemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  detailItemText: { fontSize: 14, color: theme.colors.textSecondary },
  detailItemPrice: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  detailTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: theme.spacing.md, marginBottom: theme.spacing.md, paddingTop: theme.spacing.sm,
  },
  detailTotalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.textSecondary },
  detailTotalValue: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
  modalActions: { gap: theme.spacing.sm },
});
