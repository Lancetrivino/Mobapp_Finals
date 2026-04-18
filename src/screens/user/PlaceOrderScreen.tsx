import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, FlatList, Alert } from 'react-native';
import { Header, Card, Button, Input } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { OrderItem, MenuItem, Order } from '../../types/index';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

export default function PlaceOrderScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<(OrderItem & { name: string })[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Accept an item passed from MenuBrowseScreen
  useEffect(() => {
    const item: MenuItem | undefined = route?.params?.item;
    if (item) {
      addToCart(item);
    }
  }, [route?.params?.item]);

  const addToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCartItems((prev) => {
      const updated = prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c);
      return updated;
    });
  };

  const removeItem = (menuItemId: string) => {
    setCartItems((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (cartItems.length === 0) e.cart = 'Please add at least one item.';
    if (!tableNumber.trim()) e.tableNumber = 'Table number is required.';
    else if (isNaN(Number(tableNumber)) || Number(tableNumber) <= 0) e.tableNumber = 'Enter a valid table number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const existing = await storage.getOrders();
      const newOrder: Order & { tableNumber: string; notes: string } = {
        id: Date.now().toString(),
        userId: user?.id || '',
        items: cartItems.map(({ menuItemId, quantity, price }) => ({ menuItemId, quantity, price })),
        totalAmount,
        status: 'pending',
        tableNumber,
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await storage.setOrders([...existing, newOrder]);
      Alert.alert('Order Placed!', `Order #${newOrder.id.slice(-6)} has been placed successfully.`, [
        { text: 'OK', onPress: () => navigation.navigate('MyOrders') },
      ]);
      setCartItems([]);
      setTableNumber('');
      setNotes('');
    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCartItem = ({ item }: { item: (typeof cartItems)[0] }) => (
    <Card>
      <View style={styles.cartRow}>
        <View style={styles.cartInfo}>
          <Text style={styles.cartName}>{item.name}</Text>
          <Text style={styles.cartPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
        </View>
        <View style={styles.qtyControls}>
          <Button title="−" onPress={() => updateQty(item.menuItemId, -1)} variant="outline" />
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <Button title="+" onPress={() => updateQty(item.menuItemId, 1)} variant="secondary" />
          <Button title="✕" onPress={() => removeItem(item.menuItemId)} variant="outline" />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <Header title="Place Order" />

          <Input
            placeholder="Table Number"
            value={tableNumber}
            onChangeText={(t) => { setTableNumber(t); setErrors((e) => ({ ...e, tableNumber: undefined })); }}
            keyboardType="numeric"
          />
          {errors.tableNumber && <Text style={styles.error}>{errors.tableNumber}</Text>}

          {cartItems.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Cart ({cartItems.length} item{cartItems.length > 1 ? 's' : ''})</Text>
              <FlatList
                scrollEnabled={false}
                data={cartItems}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.menuItemId}
              />
            </>
          ) : (
            <Card>
              <Text style={styles.emptyCart}>Your cart is empty.</Text>
              <Button title="Browse Menu" onPress={() => navigation.navigate('MenuBrowse')} variant="secondary" />
            </Card>
          )}
          {errors.cart && <Text style={styles.error}>{errors.cart}</Text>}

          <Input
            placeholder="Special notes or requests (optional)"
            value={notes}
            onChangeText={setNotes}
            autoCapitalize="sentences"
          />

          <Card>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
          </Card>

          <Button
            title="Place Order"
            onPress={handlePlaceOrder}
            loading={loading}
            disabled={cartItems.length === 0}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.dark, marginBottom: theme.spacing.sm, marginTop: theme.spacing.sm },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 15, fontWeight: '600', color: theme.colors.dark },
  cartPrice: { fontSize: 14, color: theme.colors.success, fontWeight: 'bold' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.dark, paddingHorizontal: 8 },
  totalLabel: { fontSize: 14, color: theme.colors.gray, marginBottom: theme.spacing.xs },
  totalAmount: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary },
  emptyCart: { textAlign: 'center', color: theme.colors.gray, marginBottom: theme.spacing.md },
  error: { color: theme.colors.error, fontSize: 12, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.sm },
});