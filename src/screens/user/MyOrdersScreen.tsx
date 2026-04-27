import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
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
import { ORDER_STATUS_CONFIG as STATUS_CONFIG } from '../../utils/orderStatus';
import { Order } from '../../types/index';
import { storage } from '../../utils/storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../components/UIComponents';

export default function MyOrdersScreen({ navigation }: any) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());
  const [pendingRating, setPendingRating] = useState<{ order: Order; stars: number } | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const userOrders = await storage.getUserOrders(user.id);
      const sorted = [...userOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(sorted);

      const completedIds = sorted.filter((o) => o.status === 'completed').map((o) => o.id);
      const rated = await storage.getRatedOrderIds(user.id, completedIds);
      setRatedOrders(rated);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    loadOrders();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Realtime subscription — scoped to this user's orders
    const channel = supabase
      .channel(`my-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            if (updated.status === 'ready') {
              Alert.alert('🍽️ Order Ready!', `Order #${updated.id.slice(-6).toUpperCase()} is ready to be served!`);
            }
            // Optimistic status update — avoids a full reload
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o))
            );
            // Keep detail modal in sync
            setDetailOrder((prev) =>
              prev?.id === updated.id ? { ...prev, status: updated.status } : prev
            );
          } else {
            // INSERT / DELETE requires full reload
            loadOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadOrders]);

  const handleCancelOrder = useCallback((order: Order) => {
    Alert.alert(
      'Cancel Order',
      `Cancel order #${order.id.slice(-6).toUpperCase()}? This cannot be undone.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.cancelOrder(order.id);
              setDetailOrder(null);
              loadOrders();
            } catch (e: any) {
              Alert.alert('Cannot Cancel', e?.message || 'Failed to cancel order.');
            }
          },
        },
      ]
    );
  }, [loadOrders]);

  const handleSubmitRating = useCallback(async () => {
    if (!pendingRating || !user?.id || pendingRating.stars === 0) return;
    setSubmittingRating(true);
    const ok = await storage.addRating({
      user_id: user.id,
      order_id: pendingRating.order.id,
      stars: pendingRating.stars,
    });
    setSubmittingRating(false);
    if (ok) {
      setRatedOrders((prev) => new Set([...prev, pendingRating.order.id]));
      setPendingRating(null);
      Alert.alert('Thanks!', 'Your rating has been submitted.');
    } else {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  }, [pendingRating, user?.id]);

  const closeDetail = useCallback(() => setDetailOrder(null), []);
  const closePendingRating = useCallback(() => setPendingRating(null), []);

  // Derived — split once per render
  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const historyOrders = orders.filter((o) => o.status === 'completed' || o.status === 'cancelled');

  const formatDate = useCallback(
    (date: string) =>
      new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>{orders.length} order{orders.length !== 1 ? 's' : ''} total</Text>
        </View>

        {loading ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {[...Array(3)].map((_, i) => <SkeletonOrderRow key={i} />)}
          </ScrollView>
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
            {activeOrders.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ACTIVE ORDER{activeOrders.length > 1 ? 'S' : ''}</Text>
                {activeOrders.map((order, index) => (
                  <ActiveOrderCard
                    key={order.id}
                    order={order}
                    index={index}
                    onPress={() => setDetailOrder(order)}
                    onCancel={order.status === 'pending' ? () => handleCancelOrder(order) : undefined}
                  />
                ))}
              </>
            )}

            {historyOrders.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ORDER HISTORY</Text>
                {historyOrders.map((order, index) => (
                  <HistoryOrderRow
                    key={order.id}
                    order={order}
                    index={index}
                    formatDate={formatDate}
                    isRated={ratedOrders.has(order.id)}
                    onPress={() => setDetailOrder(order)}
                    onRate={
                      order.status === 'completed' && !ratedOrders.has(order.id)
                        ? () => setPendingRating({ order, stars: 0 })
                        : undefined
                    }
                  />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* ── Order Detail Modal ─────────────────────────── */}
      <Modal visible={!!detailOrder} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {detailOrder && (() => {
              const cfg = STATUS_CONFIG[detailOrder.status] || {
                color: theme.colors.textMuted,
                label: detailOrder.status,
                icon: 'circle' as const,
              };
              const canCancel = detailOrder.status === 'pending';
              const canRate = detailOrder.status === 'completed' && !ratedOrders.has(detailOrder.id);
              return (
                <>
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Order #{detailOrder.id.slice(-6).toUpperCase()}</Text>
                    <TouchableOpacity onPress={closeDetail}>
                      <Feather name="x" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Feather name={cfg.icon} size={14} color={cfg.color} />
                    <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>

                  {detailOrder.table_number != null && (
                    <Text style={styles.modalMeta}>Table {detailOrder.table_number}</Text>
                  )}

                  <Text style={styles.modalSectionLabel}>Items</Text>
                  {detailOrder.items.map((it, idx) => (
                    <View key={idx} style={styles.detailRow}>
                      <Text style={styles.detailItemText}>
                        {it.quantity}× {it.name || `Item #${idx + 1}`}
                      </Text>
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

                  <View style={styles.modalBtnCol}>
                    {canCancel && (
                      <Button title="Cancel Order" onPress={() => handleCancelOrder(detailOrder)} variant="danger" />
                    )}
                    {canRate && (
                      <Button
                        title="Rate This Order"
                        onPress={() => {
                          closeDetail();
                          setPendingRating({ order: detailOrder, stars: 0 });
                        }}
                        variant="secondary"
                      />
                    )}
                    <Button title="Close" onPress={closeDetail} variant="outline" />
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Star Rating Modal ──────────────────────────── */}
      <Modal visible={!!pendingRating} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.ratingModal]}>
            <View style={styles.modalHandle} />
            <Text style={styles.ratingTitle}>Rate Your Order</Text>
            <Text style={styles.ratingSubtitle}>
              Order #{pendingRating?.order.id.slice(-6).toUpperCase()}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setPendingRating((p) => (p ? { ...p, stars: star } : p))}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="star"
                    size={40}
                    color={(pendingRating?.stars ?? 0) >= star ? '#F5A623' : theme.colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {pendingRating?.stars === 0 && (
              <Text style={styles.ratingHint}>Tap a star to rate</Text>
            )}

            <View style={styles.modalBtnCol}>
              <Button
                title="Submit Rating"
                onPress={handleSubmitRating}
                loading={submittingRating}
                disabled={!pendingRating?.stars}
              />
              <Button title="Skip" onPress={closePendingRating} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Skeleton Row ──────────────────────────────────────────
const SkeletonOrderRow: React.FC = memo(() => {
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
    <Animated.View style={[styles.activeCard, { opacity }]}>
      <View style={{ height: 14, backgroundColor: theme.colors.surfaceHigh, borderRadius: 6, width: '40%', marginBottom: 12 }} />
      <View style={{ height: 11, backgroundColor: theme.colors.surfaceHigh, borderRadius: 6, marginBottom: 6 }} />
      <View style={{ height: 11, backgroundColor: theme.colors.surfaceHigh, borderRadius: 6, width: '70%' }} />
    </Animated.View>
  );
});

// ─── Active Order Card ─────────────────────────────────────
const ActiveOrderCard: React.FC<{
  order: Order;
  index: number;
  onPress: () => void;
  onCancel?: () => void;
}> = memo(({ order, index, onPress, onCancel }) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 80, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <Animated.View style={[styles.activeCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.activeCardHeader}>
        <View style={[styles.activeStatusRow, { backgroundColor: cfg.color + '20' }]}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <Feather name={cfg.icon} size={14} color={cfg.color} />
          </Animated.View>
          <Text style={[styles.activeStatusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.activeOrderId}>#{order.id.slice(-6).toUpperCase()}</Text>
      </View>

      {order.table_number != null && (
        <Text style={styles.activeTableText}>Table {order.table_number}</Text>
      )}

      <View style={styles.activeItemsList}>
        {order.items.map((it, idx) => (
          <View key={idx} style={styles.activeItemRow}>
            <Text style={styles.activeItemName} numberOfLines={1}>
              {it.quantity}× {it.name || `Item #${idx + 1}`}
            </Text>
            <Text style={styles.activeItemPrice}>₱{(it.price * it.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.activeCardFooter}>
        <Text style={styles.activeTotalLabel}>Total</Text>
        <Text style={styles.activeTotalText}>₱{order.total_amount.toFixed(2)}</Text>
      </View>

      <View style={styles.activeCardActions}>
        <TouchableOpacity style={styles.helpBtn} onPress={onPress} activeOpacity={0.8}>
          <Feather name="info" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.helpBtnText}>Order Details</Text>
        </TouchableOpacity>
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Feather name="x" size={14} color={theme.colors.error} />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

// ─── History Row ───────────────────────────────────────────
const HistoryOrderRow: React.FC<{
  order: Order;
  index: number;
  formatDate: (d: string) => string;
  isRated: boolean;
  onPress: () => void;
  onRate?: () => void;
}> = memo(({ order, index, formatDate, isRated, onPress, onRate }) => {
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
      <TouchableOpacity style={styles.historyMain} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.historyIcon, { backgroundColor: isCompleted ? theme.colors.successLight : theme.colors.errorLight }]}>
          <Feather name={isCompleted ? 'check-circle' : 'x-circle'} size={20} color={isCompleted ? theme.colors.success : theme.colors.error} />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyName}>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            {order.table_number != null ? ` · Table ${order.table_number}` : ''}
          </Text>
          <Text style={styles.historyMeta}>
            {formatDate(order.created_at)} · ₱{order.total_amount.toFixed(2)}
          </Text>
          {isCompleted && (
            <Text style={[styles.historyRated, { color: isRated ? theme.colors.success : theme.colors.textMuted }]}>
              {isRated ? '★ Rated' : '☆ Not rated yet'}
            </Text>
          )}
        </View>
        <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>

      {onRate && (
        <TouchableOpacity style={styles.rateBtn} onPress={onRate} activeOpacity={0.75}>
          <Feather name="star" size={14} color="#F5A623" />
          <Text style={styles.rateBtnText}>Rate</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: 56, paddingBottom: theme.spacing.lg },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' },
  scrollContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 24 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: theme.spacing.md, marginTop: theme.spacing.xs },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: theme.spacing.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },

  activeCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1.5, borderColor: theme.colors.primary + '60', ...theme.shadows.medium },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  activeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.borderRadius.full },
  activeStatusText: { fontSize: 12, fontWeight: '700' },
  activeOrderId: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  activeTableText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: theme.spacing.sm },
  activeItemsList: { gap: 5, marginBottom: theme.spacing.sm },
  activeItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeItemName: { fontSize: 13, fontWeight: '600', color: theme.colors.text, flex: 1, marginRight: 8 },
  activeItemPrice: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  activeCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  activeTotalLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  activeTotalText: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  activeCardActions: { flexDirection: 'row', gap: 8 },
  helpBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.surfaceHigh, borderRadius: theme.borderRadius.medium, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border },
  helpBtnText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.errorLight, borderRadius: theme.borderRadius.medium, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.error + '40' },
  cancelBtnText: { fontSize: 13, color: theme.colors.error, fontWeight: '700' },

  historyRow: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', ...theme.shadows.small },
  historyMain: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.md },
  historyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  historyMeta: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  historyRated: { fontSize: 11, fontWeight: '600' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 10, backgroundColor: '#F5A62310' },
  rateBtnText: { fontSize: 13, fontWeight: '700', color: '#F5A623' },

  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderColor: theme.colors.border },
  ratingModal: { paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.full, marginBottom: theme.spacing.md },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  modalMeta: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  modalSectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailItemText: { fontSize: 14, color: theme.colors.text, flex: 1, marginRight: 8 },
  detailItemPrice: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  modalTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md },
  modalTotalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  modalTotalValue: { fontSize: 24, fontWeight: '800', color: theme.colors.primary },
  modalBtnCol: { gap: theme.spacing.sm },

  ratingTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 4 },
  ratingSubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.xl },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: theme.spacing.lg },
  ratingHint: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginBottom: theme.spacing.md },
});