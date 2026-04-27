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
// ─── IMPORTANT: Point this to your lib file ───
import { supabase } from '../../lib/supabase'; 
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

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsers();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Query the live public.users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (e: any) {
      Alert.alert('Database Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role });
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!editingUser || !validate()) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setModalVisible(false);
      loadUsers();
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const handleDelete = (u: User) => {
    if (u.id === currentUser?.id) {
      Alert.alert('Cannot Delete', 'You cannot delete your own account.');
      return;
    }
    Alert.alert('Delete User', `Delete "${u.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', u.id);
          
          if (error) {
            Alert.alert('Delete Failed', error.message);
          } else {
            loadUsers();
          }
        },
      },
    ]);
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
            <Text style={styles.headerTitle}>Staff Accounts</Text>
            <Text style={styles.headerSub}>{users.length} registered</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyState}><Text style={styles.emptyText}>Syncing with Database...</Text></View>
        ) : users.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Feather name="users" size={32} color={theme.colors.textMuted} /></View>
            <Text style={styles.emptyTitle}>No Accounts Found</Text>
            <Text style={styles.emptyText}>If users exist in SQL, check your RLS policies.</Text>
            <Button title="Retry Refresh" onPress={loadUsers} variant="outline" style={{marginTop: 20}} />
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Account</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input placeholder="Full Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} autoCapitalize="words" error={errors.name} icon="user" />
            <Input placeholder="Email Address" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" autoCapitalize="none" error={errors.email} icon="mail" />

            <Text style={styles.fieldLabel}>Access Role</Text>
            <View style={styles.roleToggleRow}>
              {(['user', 'admin'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, form.role === r && { backgroundColor: ROLE_CONFIG[r].color }]}
                  onPress={() => setForm({ ...form, role: r })}
                >
                  <Feather name={ROLE_CONFIG[r].icon} size={14} color={form.role === r ? '#0D1B2A' : theme.colors.textSecondary} />
                  <Text style={[styles.roleBtnText, form.role === r && { color: '#0D1B2A', fontWeight: '700' }]}>{ROLE_CONFIG[r].label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} variant="outline" />
              <Button title="Save Changes" onPress={handleSave} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── User Row Component (Keep logic as is, just ensure it handles the Supabase User type) ───
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

  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
  const initials = user.name.split(' ').map((n) => n.charAt(0)).slice(0, 2).join('').toUpperCase() || '??';

  return (
    <Animated.View style={[styles.userCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.avatarCircle, { backgroundColor: roleCfg.color + '25' }]}>
        <Text style={[styles.avatarInitials, { color: roleCfg.color }]}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userInfoTop}>
          <Text style={styles.userName} numberOfLines={1}>{user.name}{isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}</Text>
          <View style={[styles.rolePill, { backgroundColor: roleCfg.color + '20' }]}>
            <Feather name={roleCfg.icon} size={10} color={roleCfg.color} />
            <Text style={[styles.roleText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
          </View>
        </View>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.userActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(user)} activeOpacity={0.75}>
            <Feather name="edit-2" size={13} color={theme.colors.blue} />
            <Text style={[styles.actionBtnText, { color: theme.colors.blue }]}>Edit</Text>
          </TouchableOpacity>
          {!isCurrentUser && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.errorLight }]} onPress={() => onDelete(user)}>
              <Feather name="trash-2" size={13} color={theme.colors.error} />
              <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// ... Styles (remain the same as your previous code)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: 56, paddingBottom: theme.spacing.lg },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  userCard: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.md, alignItems: 'flex-start', ...theme.shadows.small },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 16, fontWeight: '800' },
  userInfo: { flex: 1 },
  userInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  userName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 },
  youBadge: { fontSize: 12, color: theme.colors.primary, fontStyle: 'italic' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.full },
  roleText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  userEmail: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.borderRadius.small, backgroundColor: theme.colors.blueLight },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderColor: theme.colors.border },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: theme.spacing.sm },
  roleToggleRow: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.medium, padding: 4, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: theme.borderRadius.medium - 2 },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
});