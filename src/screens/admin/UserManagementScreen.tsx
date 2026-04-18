import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, FlatList, Text, Modal, Alert, TouchableOpacity,
} from 'react-native';
import { Header, Card, Button, Input } from '../../components/UIComponents';
import { theme } from '../../utils/theme';
import { User } from '../../types/index';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { name: '', email: '', password: '', role: 'user' as 'admin' | 'user' };

export default function UserManagementScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadUsers(); }, []);

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
    setForm({ name: u.name, email: u.email, password: u.password || '', role: u.role });
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const allUsers = await storage.getUsers();

    if (editingUser) {
      // Check duplicate email (excluding self)
      const dup = allUsers.find((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editingUser.id);
      if (dup) { setErrors((e) => ({ ...e, email: 'Email already in use.' })); return; }
      await storage.setUsers(allUsers.map((u) =>
        u.id === editingUser.id
          ? { ...u, name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role }
          : u
      ));
    } else {
      const dup = allUsers.find((u) => u.email.toLowerCase() === form.email.toLowerCase());
      if (dup) { setErrors((e) => ({ ...e, email: 'Email already in use.' })); return; }
      const newUser: User = {
        id: Date.now().toString(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };
      await storage.setUsers([...allUsers, newUser]);
    }
    setModalVisible(false);
    loadUsers();
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
          const all = await storage.getUsers();
          await storage.setUsers(all.filter((x) => x.id !== u.id));
          loadUsers();
        },
      },
    ]);
  };

  const renderUser = ({ item }: { item: User }) => (
    <Card>
      <View style={styles.userHeader}>
        <Text style={styles.userName}>{item.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? theme.colors.secondary : theme.colors.primary }]}>
          <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.userEmail}>{item.email}</Text>
      {item.id === currentUser?.id && <Text style={styles.youLabel}>(You)</Text>}
      <View style={styles.userActions}>
        <Button title="Edit" onPress={() => openEdit(item)} variant="secondary" />
        {item.id !== currentUser?.id && (
          <Button title="Delete" onPress={() => handleDelete(item)} variant="outline" />
        )}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <Header title="User Management" subtitle={`${users.length} accounts`} />
          <Button title="+ Add New User" onPress={openAdd} />
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : users.length === 0 ? (
            <Text style={styles.emptyText}>No users found.</Text>
          ) : (
            <FlatList scrollEnabled={false} data={users} renderItem={renderUser} keyExtractor={(u) => u.id} />
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Add New User'}</Text>

            <Input placeholder="Full Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} autoCapitalize="words" />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}

            <Input placeholder="Email" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" autoCapitalize="none" />
            {errors.email && <Text style={styles.error}>{errors.email}</Text>}

            <Input placeholder="Password (min 6 chars)" value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry />
            {errors.password && <Text style={styles.error}>{errors.password}</Text>}

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {(['user', 'admin'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
                  onPress={() => setForm({ ...form, role: r })}
                >
                  <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  userName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.dark, flex: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  userEmail: { fontSize: 14, color: theme.colors.gray, marginBottom: theme.spacing.xs },
  youLabel: { fontSize: 12, color: theme.colors.primary, fontStyle: 'italic', marginBottom: theme.spacing.xs },
  userActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  emptyText: { textAlign: 'center', color: theme.colors.gray, marginVertical: theme.spacing.lg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.dark, marginBottom: theme.spacing.lg },
  label: { fontSize: 14, color: theme.colors.gray, marginBottom: theme.spacing.sm },
  roleRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.grayLight, alignItems: 'center' },
  roleBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  roleBtnText: { fontSize: 14, color: theme.colors.gray, fontWeight: '600' },
  roleBtnTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  error: { color: theme.colors.error, fontSize: 12, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.sm },
});