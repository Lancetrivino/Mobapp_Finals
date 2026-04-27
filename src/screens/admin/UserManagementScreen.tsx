import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Modal,
  Alert,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { Button, Input } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { User } from '../../types/index';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';

const emptyForm = { name: '', email: '', role: 'user' as 'admin' | 'user' };

const ROLE_CONFIG = {
  admin: { color: theme.colors.primary, label: 'Admin', icon: 'shield' as const },
  user: { color: theme.colors.teal, label: 'User', icon: 'user' as const },
};

export default function UserManagementScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsers();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await storage.getUsers();
    setUsers(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setModalVisible(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role });
    setErrors({});
    setModalVisible(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      e.name = 'Name must be at least 2 characters.';
    }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = 'Enter a valid email.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Check for email collision excluding current user
        const allUsers = await storage.getUsers();
        const dup = allUsers.find(
          (u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editingUser.id
        );
        if (dup) {
          setErrors((e) => ({ ...e, email: 'Email already in use by another account.' }));
          return;
        }

        // Only name and role are editable here.
        // Email changes require going through Supabase Auth (not done client-side).
        const success = await storage.updateUser(editingUser.id, {
          name: form.name.trim(),
          role: form.role,
        });

        if (!success) {
          Alert.alert('Error', 'Failed to update user. Please try again.');
          return;
        }
      } else {
        // Adding a user via this screen creates only the profile row.
        // The actual auth account must be created via registration.
        // This is intentional: admins manage roles/names, not passwords.
        Alert.alert(
          'Note',
          'To add a new user, ask them to register via the app. ' +
          'You can then edit their role here once they have signed up.',
          [{ text: 'OK' }]
        );
        setModalVisible(false);
        return;
      }

      setModalVisible(false);
      loadUsers();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (u: User) => {
    if (u.id === currentUser?.id) {
      Alert.alert('Cannot Delete', 'You cannot delete your own account.');
      return;
    }
    Alert.alert(
      'Delete User',
      `Remove "${u.name}" from the system?\n\nThis deletes their profile but their login may still exist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await storage.deleteUser(u.id);
            if (success) {
              loadUsers();
            } else {
              Alert.alert('Error', 'Failed to delete user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item, index }: { item: User; index: number }) => (
    <UserRow
      user={item}
      index={index}
      isCurrentUser={item.id === currentUser?.id}
      onEdit={openEdit}
      onDelete={handleDelete}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSub}>{users.length} accounts</Text>
          </View>
          {/* No + button for creating users — see handleSave note above */}
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading users...</Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="users" size={32} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Users Yet</Text>
            <Text style={styles.emptyText}>Users who register will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(u) => u.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Add User'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              placeholder="Full Name"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              autoCapitalize="words"
              error={errors.name}
              icon="user"
            />

            {/* Email is display-only when editing — changes go through Auth */}
            <View style={styles.emailReadonly}>
              <Feather name="mail" size={15} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
              <Text style={styles.emailReadonlyText} numberOfLines={1}>
                {form.email || 'Email set at registration'}
              </Text>
            </View>
            <Text style={styles.emailHint}>Email cannot be changed here.</Text>

            <Text style={styles.fieldLabel}>Access Role</Text>
            <View style={styles.roleToggleRow}>
              {(['user', 'admin'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleBtn,
                    form.role === r && { backgroundColor: ROLE_CONFIG[r].color },
                  ]}
                  onPress={() => setForm({ ...form, role: r })}
                  activeOpacity={0.75}
                >
                  <Feather
                    name={ROLE_CONFIG[r].icon}
                    size={14}
                    color={form.role === r ? '#0D1B2A' : theme.colors.textSecondary}
                  />
                  <Text style={[
                    styles.roleBtnText,
                    form.role === r && { color: '#0D1B2A', fontWeight: '700' },
                  ]}>
                    {ROLE_CONFIG[r].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setModalVisible(false)}
                variant="outline"
                disabled={isSubmitting}
              />
              <Button
                title={editingUser ? 'Save Changes' : 'Done'}
                onPress={handleSave}
                loading={isSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── User Row ──────────────────────────────────────────────
const UserRow: React.FC<{
  user: User;
  index: number;
  isCurrentUser: boolean;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
}> = ({ user, index, isCurrentUser, onEdit, onDelete }) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 60, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.user;
  const initials = user.name
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Animated.View
      style={[styles.userCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={[styles.avatarCircle, { backgroundColor: roleCfg.color + '25' }]}>
        <Text style={[styles.avatarInitials, { color: roleCfg.color }]}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userInfoTop}>
          <Text style={styles.userName}>
            {user.name}
            {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
          </Text>
          <View style={[styles.rolePill, { backgroundColor: roleCfg.color + '20' }]}>
            <Feather name={roleCfg.icon} size={10} color={roleCfg.color} />
            <Text style={[styles.roleText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
          </View>
        </View>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.userActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(user)} activeOpacity={0.75}>
            <Feather name="edit-2" size={13} color={theme.colors.blue} />
            <Text style={[styles.actionBtnText, { color: theme.colors.blue }]}>Edit Role</Text>
          </TouchableOpacity>
          {!isCurrentUser && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.errorLight }]}
              onPress={() => onDelete(user)}
              activeOpacity={0.75}
            >
              <Feather name="trash-2" size={13} color={theme.colors.error} />
              <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingTop: 56, paddingBottom: theme.spacing.lg,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },
  userCard: {
    flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1,
    borderColor: theme.colors.border, gap: theme.spacing.md, alignItems: 'flex-start', ...theme.shadows.small,
  },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 16, fontWeight: '800' },
  userInfo: { flex: 1 },
  userInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  userName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 },
  youBadge: { fontSize: 12, color: theme.colors.primary, fontStyle: 'italic' },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.full,
  },
  roleText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  userEmail: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.blueLight,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderColor: theme.colors.border,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: theme.colors.borderStrong,
    borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  emailReadonly: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium, backgroundColor: theme.colors.surfaceHigh,
    paddingHorizontal: theme.spacing.md, paddingVertical: 14, marginBottom: 4,
  },
  emailReadonlyText: { flex: 1, fontSize: 15, color: theme.colors.textMuted },
  emailHint: { fontSize: 11, color: theme.colors.textMuted, marginBottom: theme.spacing.md, marginLeft: 4 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: theme.spacing.sm,
  },
  roleToggleRow: {
    flexDirection: 'row', backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium, padding: 4,
    marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, gap: 4,
  },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: theme.borderRadius.medium - 2, backgroundColor: 'transparent',
  },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
});