import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { Button, Input } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { CartItem } from '../../types/index';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';

export default function PlaceOrderScreen({ navigation, route }: any) {
  const { user } = useAuth();

  const initialCart: CartItem[] = route?.params?.cartItems ?? [];
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCart);
  const [tableNumber, setTableNumber] = useState<string>(
    route?.params?.tableNumber ? String(route.params.tableNumber) : ''
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const updateQty = useCallback((menu_item_id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((c) => c.menu_item_id === menu_item_id ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (cartItems.length === 0) e.cart = 'Please add at least one item.';
    const tableNum = Number(tableNumber.trim());
    if (!tableNumber.trim()) {
      e.tableNumber = 'Table number is required.';
    } else if (!Number.isInteger(tableNum) || tableNum <= 0 || tableNum > 200) {
      e.tableNumber = 'Enter a valid table number (1–200).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [cartItems, tableNumber]);

  const handlePlaceOrder = useCallback(async () => {
    if (!validate() || !user?.id) return;

    setLoading(true);
    try {
      const newOrder = await storage.createOrder(
        user.id,
        cartItems,
        totalAmount,
        Number(tableNumber.trim()),
        notes.trim() || undefined
      );

      if (newOrder) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Order Placed! 🎉',
          `Order #${newOrder.id.slice(-6).toUpperCase()} for Table ${newOrder.table_number} has been submitted.`,
          [{ text: 'View My Orders', onPress: () => navigation.navigate('MyOrders') }]
        );
        setCartItems([]);
        setTableNumber('');
        setNotes('');
      } else {
        Alert.alert('Error', 'Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('[PlaceOrderScreen] handlePlaceOrder:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [validate, user?.id, cartItems, totalAmount, tableNumber, notes, navigation]);

  const handleTableChange = useCallback((t: string) => {
    setTableNumber(t);
    setErrors((e) => ({ ...e, tableNumber: undefined }));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Place Order</Text>
          <Text style={styles.headerSub}>
            {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart
          </Text>
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionLabel}>TABLE NUMBER</Text>
          <Input
            placeholder="e.g. 8"
            value={tableNumber}
            onChangeText={handleTableChange}
            keyboardType="numeric"
            error={errors.tableNumber}
            icon="hash"
          />

          <Text style={styles.sectionLabel}>ORDER ITEMS</Text>
          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Feather name="shopping-cart" size={32} color={theme.colors.textMuted} />
              <Text style={styles.emptyCartText}>Your cart is empty.</Text>
              <Button title="Browse Menu" onPress={() => navigation.navigate('MenuBrowse')} variant="secondary" />
            </View>
          ) : (
            <View style={styles.cartList}>
              {cartItems.map((item, index) => (
                <CartRow key={item.menu_item_id} item={item} index={index} onUpdateQty={updateQty} />
              ))}
            </View>
          )}
          {errors.cart && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={13} color={theme.colors.error} />
              <Text style={styles.errorText}>{errors.cart}</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>SPECIAL NOTES</Text>
          <Input
            placeholder="Allergies, preferences... (optional)"
            value={notes}
            onChangeText={setNotes}
            autoCapitalize="sentences"
            icon="message-square"
          />

          {cartItems.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{totalAmount.toFixed(2)}</Text>
              </View>
              {tableNumber.trim() !== '' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Table</Text>
                  <Text style={styles.summaryValue}>#{tableNumber.trim()}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotal}>₱{totalAmount.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <Button
            title="Place Order"
            onPress={handlePlaceOrder}
            loading={loading}
            disabled={cartItems.length === 0}
            icon="check-circle"
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Cart Row — memoized so it only re-renders when its own item changes ──────
const CartRow: React.FC<{
  item: CartItem;
  index: number;
  onUpdateQty: (id: string, delta: number) => void;
}> = memo(({ item, index, onUpdateQty }) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 60, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDecrement = useCallback(() => onUpdateQty(item.menu_item_id, -1), [item.menu_item_id, onUpdateQty]);
  const handleIncrement = useCallback(() => onUpdateQty(item.menu_item_id, 1), [item.menu_item_id, onUpdateQty]);
  const handleDelete = useCallback(() => onUpdateQty(item.menu_item_id, -item.quantity), [item.menu_item_id, item.quantity, onUpdateQty]);

  const renderRightActions = useCallback(
    () => (
      <TouchableOpacity style={styles.swipeDelete} onPress={handleDelete} activeOpacity={0.8}>
        <Feather name="trash-2" size={20} color="#fff" />
      </TouchableOpacity>
    ),
    [handleDelete]
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <Animated.View style={[styles.cartRow, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemUnitPrice}>₱{item.price.toFixed(2)} each</Text>
        </View>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={handleDecrement} activeOpacity={0.75}>
            <Feather name="minus" size={14} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={handleIncrement} activeOpacity={0.75}>
            <Feather name="plus" size={14} color="#0D1B2A" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cartItemTotal}>₱{(item.price * item.quantity).toFixed(2)}</Text>
      </Animated.View>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingTop: 52, paddingBottom: theme.spacing.md },
  backBtn: { width: 40, height: 40, backgroundColor: theme.colors.surface, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  scrollContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  emptyCart: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, padding: theme.spacing.xl, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md },
  emptyCartText: { fontSize: 14, color: theme.colors.textSecondary },
  cartList: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md, overflow: 'hidden', ...theme.shadows.small },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: theme.spacing.sm, backgroundColor: theme.colors.surface },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  cartItemUnitPrice: { fontSize: 12, color: theme.colors.textMuted },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, backgroundColor: theme.colors.surfaceHigh, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borderStrong },
  qtyBtnAdd: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  qtyText: { fontSize: 15, fontWeight: '700', color: theme.colors.text, minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, minWidth: 56, textAlign: 'right' },
  summaryCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.small },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  summaryTotal: { fontSize: 22, fontWeight: '800', color: theme.colors.primary },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  errorText: { fontSize: 12, color: theme.colors.error, fontWeight: '500' },
  swipeDelete: { backgroundColor: theme.colors.error, justifyContent: 'center', alignItems: 'center', width: 72, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
});