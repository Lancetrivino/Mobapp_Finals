import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Text,
  Modal,
  Alert,
  TouchableOpacity,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { MenuItem } from '../../types/index';
import { storage } from '../../utils/storage';
import { Feather } from '@expo/vector-icons';

const CATEGORIES = ['Appetizer', 'Main Course', 'Dessert', 'Beverage'];
const emptyForm = { name: '', description: '', price: '', category: 'Main Course', image: '' };

const CATEGORY_ICONS: Record<string, string> = {
  Appetizer: 'star',
  'Main Course': 'zap',
  Dessert: 'heart',
  Beverage: 'coffee',
};

export default function MenuManagementScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMenuItems();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

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
    setForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, image: item.image_url || '' });
    setErrors({});
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add food photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setForm((f) => ({ ...f, image: result.assets[0].uri }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    const p = parseFloat(form.price);
    if (!form.price || isNaN(p) || p <= 0) e.price = 'Enter a valid price.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const itemData = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      category: form.category,
      image_url: form.image || undefined,
      available: true,
    };

    if (editingItem) {
      const success = await storage.updateMenuItem(editingItem.id, itemData);
      if (success) {
        setModalVisible(false);
        loadMenuItems();
      }
    } else {
      const newItem = await storage.addMenuItem(itemData);
      if (newItem) {
        setModalVisible(false);
        loadMenuItems();
      }
    }
  };

  const handleDelete = (item: MenuItem) => {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await storage.deleteMenuItem(item.id);
          if (success) {
            loadMenuItems();
          }
        },
      },
    ]);
  };

  const toggleAvailable = async (item: MenuItem) => {
    const success = await storage.updateMenuItem(item.id, { available: !item.available });
    if (success) {
      loadMenuItems();
    }
  };

  const renderItem = ({ item, index }: { item: MenuItem; index: number }) => (
    <MenuItemRow item={item} index={index} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleAvailable} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Menu Management</Text>
            <Text style={styles.headerSub}>{menuItems.length} items total</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Feather name="plus" size={20} color="#0D1B2A" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading menu...</Text>
          </View>
        ) : menuItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="book-open" size={32} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Menu Items</Text>
            <Text style={styles.emptyText}>Tap + to add your first item.</Text>
          </View>
        ) : (
          <FlatList
            data={menuItems}
            renderItem={renderItem}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'New Menu Item'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Food Photo Picker */}
              <Text style={styles.fieldLabel}>Food Photo</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                {form.image ? (
                  <>
                    <Image source={{ uri: form.image }} style={styles.imagePreview} />
                    <View style={styles.imageEditBadge}>
                      <Feather name="camera" size={14} color="#fff" />
                      <Text style={styles.imageEditText}>Change</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <View style={styles.imagePlaceholderIcon}>
                      <Feather name="camera" size={24} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.imagePlaceholderText}>Tap to add food photo</Text>
                    <Text style={styles.imagePlaceholderSub}>Optional — recommended 4:3</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Input
                placeholder="Item Name"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                autoCapitalize="words"
                error={errors.name}
                icon="tag"
              />
              <Input
                placeholder="Description"
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                autoCapitalize="sentences"
                error={errors.description}
                icon="file-text"
              />
              <Input
                placeholder="Price (e.g. 9.99)"
                value={form.price}
                onChangeText={(t) => setForm({ ...form, price: t })}
                keyboardType="decimal-pad"
                error={errors.price}
                icon="dollar-sign"
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catBtn, form.category === cat && styles.catBtnActive]}
                    onPress={() => setForm({ ...form, category: cat })}
                    activeOpacity={0.75}
                  >
                    <Feather
                      name={(CATEGORY_ICONS[cat] || 'circle') as any}
                      size={14}
                      color={form.category === cat ? '#0D1B2A' : theme.colors.textSecondary}
                    />
                    <Text style={[styles.catBtnText, form.category === cat && styles.catBtnTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button title="Cancel" onPress={() => setModalVisible(false)} variant="outline" />
                <Button title={editingItem ? 'Save Changes' : 'Add Item'} onPress={handleSave} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Menu Item Row ─────────────────────────────────────────
const MenuItemRow: React.FC<{
  item: MenuItem;
  index: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onToggle: (item: MenuItem) => void;
}> = ({ item, index, onEdit, onDelete, onToggle }) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 60, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const iconName = (CATEGORY_ICONS[item.category] || 'circle') as any;

  return (
    <Animated.View
      style={[styles.itemCard, !item.available && styles.itemCardDim, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemIconWrap, { backgroundColor: item.available ? theme.colors.accentLight : theme.colors.border }]}>
          <Feather name={iconName} size={20} color={item.available ? theme.colors.accent : theme.colors.textMuted} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <View style={styles.itemInfoTop}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
        </View>
        <Text style={styles.itemCat}>{item.category}</Text>
        <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)} activeOpacity={0.75}>
            <Feather name="edit-2" size={14} color={theme.colors.blue} />
            <Text style={[styles.actionBtnText, { color: theme.colors.blue }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: item.available ? theme.colors.warningLight : theme.colors.successLight }]}
            onPress={() => onToggle(item)}
            activeOpacity={0.75}
          >
            <Feather
              name={item.available ? 'eye-off' : 'eye'}
              size={14}
              color={item.available ? theme.colors.warning : theme.colors.success}
            />
            <Text style={[styles.actionBtnText, { color: item.available ? theme.colors.warning : theme.colors.success }]}>
              {item.available ? 'Disable' : 'Enable'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.errorLight }]} onPress={() => onDelete(item)} activeOpacity={0.75}>
            <Feather name="trash-2" size={14} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
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
    paddingTop: 56,
    paddingBottom: theme.spacing.lg,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.medium,
  },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 24 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },

  itemCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    ...theme.shadows.small,
  },
  itemCardDim: { opacity: 0.65 },
  itemIconWrap: {
    width: 56, height: 56,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center', justifyContent: 'center',
  },
  itemImage: {
    width: 56, height: 56,
    borderRadius: theme.borderRadius.medium,
  },
  itemInfo: { flex: 1 },
  itemInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  itemName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  itemCat: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  itemDesc: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  itemActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.blueLight,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // Modal
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: theme.spacing.sm },

  // Image picker
  imagePicker: {
    borderRadius: theme.borderRadius.large,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
  },
  imageEditText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  imagePlaceholder: {
    aspectRatio: 4 / 3,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholderText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  imagePlaceholderSub: { fontSize: 11, color: theme.colors.textMuted },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  catBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catBtnText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  catBtnTextActive: { color: '#0D1B2A', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
});
