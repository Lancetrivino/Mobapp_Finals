import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Text, Modal } from 'react-native';
import { Header, Card, Button } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { Order } from '../../types/index';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

const statusColors: Record<string, string> = {
  pending: theme.colors.warning,
  confirmed: theme.colors.primary,
  preparing: '#E67E22',
  ready: theme.colors.success,
  completed: '#27AE60',
  cancelled: theme.colors.error,
};

export default function MyOrdersScreen({ navigation }: any) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<(Order & { tableNumber?: string; notes?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<(Order & { tableNumber?: string; notes?: string }) | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadOrders);
    return unsubscribe;
  }, [navigation]);

  const loadOrders = async () => {
    setLoading(true);
    const all = await storage.getOrders();
    // Users only see their own orders
    const myOrders = all.filter((o) => o.userId === user?.id);
    setOrders([...myOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  };

  const renderOrder = ({ item }: { item: (typeof orders)[0] }) => (
    <Card>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{item.id.slice(-6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || theme.colors.gray }]}>
          <Text style={styles.statusText}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
        </View>
      </View>
      {item.tableNumber && <Text style={styles.meta}>Table: {item.tableNumber}</Text>}
      <Text style={styles.meta}>{item.items.length} item(s)</Text>
      <Text style={styles.amount}>Total: ₱{item.totalAmount.toFixed(2)}</Text>
      <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
      <Button title="View Details" onPress={() => setDetailOrder(item)} variant="secondary" />
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <Header title="My Orders" subtitle={`${orders.length} order(s)`} />
          {loading ? (
            <Text style={styles.emptyText}>Loading orders...</Text>
          ) : orders.length === 0 ? (
            <>
              <Text style={styles.emptyText}>No orders yet.</Text>
              <Button title="Browse Menu" onPress={() => navigation.navigate('MenuBrowse')} />
            </>
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

                <View style={[styles.statusBadge, { backgroundColor: statusColors[detailOrder.status], alignSelf: 'flex-start', marginBottom: theme.spacing.md }]}>
                  <Text style={styles.statusText}>{detailOrder.status}</Text>
                </View>

                {detailOrder.tableNumber && (
                  <Text style={styles.detailMeta}>Table: {detailOrder.tableNumber}</Text>
                )}

                <Text style={styles.sectionLabel}>Items</Text>
                {detailOrder.items.map((it, idx) => (
                  <Text key={idx} style={styles.detailItem}>• Qty {it.quantity} × ₱{it.price.toFixed(2)} = ₱{(it.quantity * it.price).toFixed(2)}</Text>
                ))}

                {detailOrder.notes ? (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: theme.spacing.sm }]}>Notes</Text>
                    <Text style={styles.detailMeta}>{detailOrder.notes}</Text>
                  </>
                ) : null}

                <Text style={styles.totalText}>Total: ₱{detailOrder.totalAmount.toFixed(2)}</Text>
                <Text style={styles.date}>{new Date(detailOrder.createdAt).toLocaleString()}</Text>

                <Button title="Close" onPress={() => setDetailOrder(null)} variant="outline" />
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
  meta: { fontSize: 13, color: theme.colors.gray, marginBottom: 2 },
  amount: { fontSize: 15, fontWeight: 'bold', color: theme.colors.primary, marginVertical: theme.spacing.xs },
  date: { fontSize: 12, color: theme.colors.gray, marginBottom: theme.spacing.sm },
  emptyText: { textAlign: 'center', color: theme.colors.gray, marginVertical: theme.spacing.lg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.dark, marginBottom: theme.spacing.sm },
  sectionLabel: { fontSize: 13, color: theme.colors.gray, fontWeight: '600', marginBottom: 4 },
  detailItem: { fontSize: 14, color: theme.colors.dark, marginBottom: 2 },
  detailMeta: { fontSize: 14, color: theme.colors.gray, marginBottom: theme.spacing.xs },
  totalText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, marginVertical: theme.spacing.sm },
});