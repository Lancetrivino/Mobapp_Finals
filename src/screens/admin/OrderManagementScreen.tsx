import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Text, Modal, Alert, TouchableOpacity } from 'react-native';
import { Header, Card, Button } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { Order } from '../../types/index';
import { storage } from '../../utils/storage';

const STATUS_FLOW: Order['status'][] = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

const statusColors: Record<string, string> = {
  pending: theme.colors.warning,
  confirmed: theme.colors.primary,
  preparing: '#E67E22',
  ready: theme.colors.success,
  completed: '#27AE60',
  cancelled: theme.colors.error,
};

export default function OrderManagementScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    const data = await storage.getOrders();
    // Newest first
    setOrders([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  };

  const advanceStatus = async (order: Order) => {
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIndex + 1];
    const all = await storage.getOrders();
    await storage.setOrders(all.map((o) => o.id === order.id ? { ...o, status: nextStatus, updatedAt: new Date() } : o));
    if (detailOrder?.id === order.id) setDetailOrder({ ...order, status: nextStatus });
    loadOrders();
  };

  const cancelOrder = async (order: Order) => {
    Alert.alert('Cancel Order', `Cancel Order #${order.id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          const all = await storage.getOrders();
          await storage.setOrders(all.map((o) => o.id === order.id ? { ...o, status: 'cancelled', updatedAt: new Date() } : o));
          setDetailOrder(null);
          loadOrders();
        },
      },
    ]);
  };

  const deleteOrder = async (order: Order) => {
    Alert.alert('Delete Order', `Permanently delete Order #${order.id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const all = await storage.getOrders();
          await storage.setOrders(all.filter((o) => o.id !== order.id));
          setDetailOrder(null);
          loadOrders();
        },
      },
    ]);
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const currentIndex = STATUS_FLOW.indexOf(item.status);
    const canAdvance = item.status !== 'completed' && item.status !== 'cancelled';
    return (
      <Card>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{item.id.slice(-6)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || theme.colors.gray }]}>
            <Text style={styles.statusText}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
          </View>
        </View>
        <Text style={styles.orderMeta}>Table: {(item as any).tableNumber || 'N/A'}</Text>
        <Text style={styles.orderMeta}>{item.items.length} item(s)</Text>
        <Text style={styles.orderAmount}>Total: ₱{item.totalAmount.toFixed(2)}</Text>
        <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleString()}</Text>
        <View style={styles.orderActions}>
          <Button title="Details" onPress={() => setDetailOrder(item)} variant="secondary" />
          {canAdvance && (
            <Button title={`→ ${STATUS_FLOW[currentIndex + 1] ?? ''}`} onPress={() => advanceStatus(item)} />
          )}
          <Button title="Delete" onPress={() => deleteOrder(item)} variant="outline" />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <Header title="Order Management" subtitle={`${orders.length} orders`} />
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : orders.length === 0 ? (
            <Text style={styles.emptyText}>No orders yet.</Text>
          ) : (
            <FlatList scrollEnabled={false} data={orders} renderItem={renderOrder} keyExtractor={(i) => i.id} />
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!detailOrder} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {detailOrder && (
              <>
                <Text style={styles.modalTitle}>Order #{detailOrder.id.slice(-6)}</Text>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[detailOrder.status], alignSelf: 'flex-start', marginBottom: theme.spacing.md }]}>
                  <Text style={styles.statusText}>{detailOrder.status}</Text>
                </View>
                <Text style={styles.detailLabel}>Items</Text>
                {detailOrder.items.map((it, idx) => (
                  <Text key={idx} style={styles.detailItem}>• Qty {it.quantity} × ₱{it.price.toFixed(2)}</Text>
                ))}
                <Text style={[styles.orderAmount, { marginTop: theme.spacing.sm }]}>Total: ₱{detailOrder.totalAmount.toFixed(2)}</Text>

                <View style={styles.modalActions}>
                  <Button title="Close" onPress={() => setDetailOrder(null)} variant="outline" />
                  {detailOrder.status !== 'completed' && detailOrder.status !== 'cancelled' && (
                    <>
                      <Button title="Advance Status" onPress={() => advanceStatus(detailOrder)} />
                      <Button title="Cancel Order" onPress={() => cancelOrder(detailOrder)} variant="outline" />
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  orderId: { fontSize: 16, fontWeight: 'bold', color: theme.colors.dark },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  orderMeta: { fontSize: 13, color: theme.colors.gray, marginBottom: 2 },
  orderAmount: { fontSize: 15, fontWeight: 'bold', color: theme.colors.primary, marginVertical: theme.spacing.xs },
  orderDate: { fontSize: 12, color: theme.colors.gray, marginBottom: theme.spacing.sm },
  orderActions: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  emptyText: { textAlign: 'center', color: theme.colors.gray, marginVertical: theme.spacing.lg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.dark, marginBottom: theme.spacing.md },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', marginTop: theme.spacing.md },
  detailLabel: { fontSize: 13, color: theme.colors.gray, marginBottom: 4, fontWeight: '600' },
  detailItem: { fontSize: 14, color: theme.colors.dark, marginBottom: 2 },
});