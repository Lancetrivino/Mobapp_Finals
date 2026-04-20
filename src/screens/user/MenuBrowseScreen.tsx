import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { MenuItem } from '../../types/index';
import { storage } from '../../utils/storage';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - theme.spacing.lg * 2 - theme.spacing.md) / 2;

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  All: 'grid',
  Appetizer: 'star',
  'Main Course': 'zap',
  Dessert: 'heart',
  Beverage: 'coffee',
  Burgers: 'zap',
  Salads: 'droplet',
  Drinks: 'coffee',
};

type CartItem = { menuItemId: string; name: string; quantity: number; price: number };

export default function MenuBrowseScreen({ navigation }: any) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cartBarAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadMenuItems();
    }, [])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Animate cart bar in/out
  useEffect(() => {
    Animated.spring(cartBarAnim, {
      toValue: cart.length > 0 ? 1 : 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [cart.length]);

  const loadMenuItems = async () => {
    setLoading(true);
    const items = await storage.getMenuItems();
    setMenuItems(items);
    setLoading(false);
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map((i) => i.category)))];

  const filtered = menuItems.filter((item) => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: MenuItem) => {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handlePlaceOrder = () => {
    navigation.navigate('PlaceOrder', { cartItems: cart });
  };

  const tableLabel = `T-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;

  const renderItem = ({ item, index }: { item: MenuItem; index: number }) => (
    <MenuGridCard item={item} index={index} onAdd={addToCart} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.tableBadge}>
              <Text style={styles.tableBadgeText}>{tableLabel}</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Menu Screen</Text>
              <Text style={styles.headerSub}>TABLE {tableLabel.slice(2)} • ACTIVE</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cartIconBtn}
            onPress={cart.length > 0 ? handlePlaceOrder : undefined}
            activeOpacity={0.8}
          >
            <Feather name="shopping-cart" size={20} color={theme.colors.text} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Category chips */}
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Grid */}
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading menu...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Items Found</Text>
            <Text style={styles.emptyText}>Try a different category or search.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.gridContent, { paddingBottom: cartCount > 0 ? 100 : 24 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {/* Floating Place Order Bar */}
      <Animated.View
        style={[
          styles.cartBar,
          {
            transform: [
              {
                translateY: cartBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: cartBarAnim,
          },
        ]}
      >
        <TouchableOpacity style={styles.cartBarBtn} onPress={handlePlaceOrder} activeOpacity={0.85}>
          <Text style={styles.cartBarText}>
            Place Order ({cartCount} Item{cartCount !== 1 ? 's' : ''})
          </Text>
          <Text style={styles.cartBarPrice}>₱{cartTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Menu Grid Card ────────────────────────────────────────
const MenuGridCard: React.FC<{
  item: MenuItem;
  index: number;
  onAdd: (item: MenuItem) => void;
}> = ({ item, index, onAdd }) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 60, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const iconName = (CATEGORY_ICONS[item.category] || 'circle') as keyof typeof Feather.glyphMap;

  const onPressAdd = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
    onAdd(item);
  };

  return (
    <Animated.View
      style={[
        styles.gridCard,
        !item.available && styles.gridCardDim,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      {/* Image / icon area */}
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={[styles.gridItemImage, !item.available && { opacity: 0.5 }]}
        />
      ) : (
        <View style={[styles.gridIconArea, { backgroundColor: item.available ? theme.colors.accentLight : theme.colors.border }]}>
          <Feather
            name={iconName}
            size={28}
            color={item.available ? theme.colors.accent : theme.colors.textMuted}
          />
        </View>
      )}

      {/* Info */}
      <Text style={styles.gridItemName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.gridItemDesc} numberOfLines={1}>{item.description}</Text>

      {/* Price + Add */}
      <View style={styles.gridItemBottom}>
        <Text style={styles.gridItemPrice}>₱{item.price.toFixed(2)}</Text>
        {item.available ? (
          <TouchableOpacity style={styles.addBtn} onPress={onPressAdd} activeOpacity={1}>
            <Feather name="plus" size={16} color="#0D1B2A" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.outOfStock}>OUT OF STOCK</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 52,
    paddingBottom: theme.spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  tableBadge: {
    backgroundColor: theme.colors.primary,
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.small,
  },
  tableBadgeText: { fontSize: 12, fontWeight: '800', color: '#0D1B2A' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8, marginTop: 1 },
  cartIconBtn: {
    width: 42, height: 42,
    backgroundColor: theme.colors.surface,
    borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: theme.colors.primary,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 10, fontWeight: '800', color: '#0D1B2A' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, height: '100%' },

  chipScroll: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: '#0D1B2A', fontWeight: '700' },

  gridRow: { gap: theme.spacing.md, marginBottom: theme.spacing.md },
  gridContent: { paddingHorizontal: theme.spacing.lg },

  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  gridCardDim: { opacity: 0.6 },
  gridIconArea: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  gridItemImage: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  gridItemName: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  gridItemDesc: { fontSize: 11, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  gridItemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridItemPrice: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.small,
  },
  outOfStock: { fontSize: 9, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: theme.colors.background + 'EE',
  },
  cartBarBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.large,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.large,
  },
  cartBarText: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  cartBarPrice: { fontSize: 16, fontWeight: '800', color: '#0D1B2A' },
});
