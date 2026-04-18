import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, FlatList, Text,
  Modal, Alert, TouchableOpacity,
} from 'react-native';
import { Header, Card, Button, Input } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { MenuItem } from '../../types/index';
import { storage } from '../../utils/storage';

const CATEGORIES = ['Appetizer', 'Main Course', 'Dessert', 'Beverage'];

const emptyForm = { name: '', description: '', price: '', category: 'Main Course' };

export default function MenuManagementScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadMenuItems(); }, []);

  const loadMenuItems = async () => {
    setLoading(true);
    const items = await storage.getMenuItems();
    setMenuItems(items);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setErrors({});
    setModalVisible(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description, price: String(item.price), category: item.category });
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    const p = parseFloat(form.price);
    if (!form.price || isNaN(p) || p <= 0) e.price = 'Price must be a number greater than 0.';
    if (!form.category) e.category = 'Category is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const items = await storage.getMenuItems();
    if (editingItem) {
      const updated = items.map((i) =>
        i.id === editingItem.id
          ? { ...i, name: form.name.trim(), description: form.description.trim(), price: parseFloat(form.price), category: form.category }
          : i
      );
      await storage.setMenuItems(updated);
    } else {
      const newItem: MenuItem = {
        id: Date.now().toString(),
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        available: true,
      };
      await storage.setMenuItems([...items, newItem]);
    }
    setModalVisible(false);
    loadMenuItems();
  };

  const handleDelete = (item: MenuItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const items = await storage.getMenuItems();
            await storage.setMenuItems(items.filter((i) => i.id !== item.id));
            loadMenuItems();
          },
        },
      ]
    );
  };

  const toggleAvailable = async (item: MenuItem) => {
    const items = await storage.getMenuItems();
    await storage.setMenuItems(items.map((i) => i.id === item.id ? { ...i, available: !i.available } : i));
    loadMenuItems();
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <Card>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={[styles.badge, { backgroundColor: item.available ? theme.colors.success : theme.colors.gray }]}>
          {item.available ? 'Available' : 'Unavailable'}
        </Text>
      </View>
      <Text style={styles.itemCategory}>{item.category}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
      <View style={styles.itemActions}>
        <Button title="Edit" onPress={() => openEdit(item)} variant="secondary" />
        <Button title={item.available ? 'Disable' : 'Enable'} onPress={() => toggleAvailable(item)} variant="outline" />
        <Button title="Delete" onPress={() => handleDelete(item)} variant="outline" />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <Header title="Menu Management" subtitle={`${menuItems.length} items`} />
          <Button title="+ Add New Item" onPress={openAdd} />
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : menuItems.length === 0 ? (
            <Text style={styles.emptyText}>No menu items yet. Add one!</Text>
          ) : (
            <FlatList scrollEnabled={false} data={menuItems} renderItem={renderMenuItem} keyExtractor={(i) => i.id} />
          )}
        </View>
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>

            <Input placeholder="Item Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} autoCapitalize="words" />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}

            <Input placeholder="Description" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} autoCapitalize="sentences" />
            {errors.description && <Text style={styles.error}>{errors.description}</Text>}

            <Input placeholder="Price (e.g. 9.99)" value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} keyboardType="decimal-pad" />
            {errors.price && <Text style={styles.error}>{errors.price}</Text>}

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, form.category === cat && styles.catBtnActive]}
                  onPress={() => setForm({ ...form, category: cat })}
                >
                  <Text style={[styles.catBtnText, form.category === cat && styles.catBtnTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && <Text style={styles.error}>{errors.category}</Text>}

            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} variant="outline" />
              <Button title="Save" onPress={handleSave} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  itemName: { fontSize: 17, fontWeight: 'bold', color: theme.colors.dark, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, color: '#fff', fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },
  itemCategory: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginBottom: theme.spacing.xs },
  itemDescription: { fontSize: 14, color: theme.colors.gray, marginBottom: theme.spacing.sm },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: theme.colors.success, marginBottom: theme.spacing.md },
  itemActions: { flexDirection: 'row', gap: theme.spacing.sm },
  emptyText: { textAlign: 'center', color: theme.colors.gray, marginVertical: theme.spacing.lg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.dark, marginBottom: theme.spacing.lg },
  label: { fontSize: 14, color: theme.colors.gray, marginBottom: theme.spacing.sm },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.grayLight },
  catBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catBtnText: { fontSize: 13, color: theme.colors.gray },
  catBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  error: { color: theme.colors.error, fontSize: 12, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.sm },
});