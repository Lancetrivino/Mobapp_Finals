import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, FlatList, Text, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { Header, MenuItemCard } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { MenuItem } from '../../types/index';
import { storage } from '../../utils/storage';
import { Feather } from '@expo/vector-icons';

export default function MenuBrowseScreen({ navigation }: any) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadMenuItems(); }, []);

  const loadMenuItems = async () => {
    setLoading(true);
    const items = await storage.getMenuItems();
    setMenuItems(items);
    setLoading(false);
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map((i) => i.category)))];

  const filtered = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter((i) => i.category === selectedCategory);

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <MenuItemCard
      name={item.name}
      description={item.description}
      price={item.price}
      category={item.category}
      available={item.available}
      onOrder={() => navigation.navigate('PlaceOrder', { item })}
    />
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Header title="Menu" subtitle={`${filtered.length} item${filtered.length !== 1 ? 's' : ''} available`} />

          {/* Category Filter */}
          <Text style={styles.filterLabel}>Filter by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterBtn, selectedCategory === cat && styles.filterBtnActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading delicious items...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color={theme.colors.gray} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No Items Found</Text>
              <Text style={styles.emptyText}>No items in this category. Try another!</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={filtered}
              renderItem={renderMenuItem}
              keyExtractor={(item) => item.id}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },

  // Filter Label
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Filter Scroll
  filterScroll: {
    marginBottom: theme.spacing.lg,
  },

  // Filter Button
  filterBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  filterBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: theme.colors.gray,
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.white,
    fontWeight: '700',
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyIcon: {
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
  },
});