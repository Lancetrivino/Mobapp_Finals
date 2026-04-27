import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../utils/theme';
import { storage } from '../../utils/storage';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';

const QUICK_ACTIONS = [
  { label: 'My Orders', icon: 'shopping-bag' as const, route: 'MyOrders', color: theme.colors.primary },
  { label: 'Browse & Order', icon: 'grid' as const, route: 'MenuBrowse', color: theme.colors.accent },
  { label: 'Change Password', icon: 'lock' as const, route: null, color: theme.colors.teal },
];

export default function UserDashboardScreen({ navigation }: any) {
  const { user, logout, updateAvatar } = useAuth();
  const [orderCount, setOrderCount] = useState(0);
  const [rating] = useState(4.8);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(avatarScaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    if (user?.id) {
      const userOrders = await storage.getUserOrders(user.id);
      setOrderCount(userOrders.length);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadingAvatar(true);
    try {
      await updateAvatar(result.assets[0].uri);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleActionPress = (route: string | null, label: string) => {
    if (label === 'Change Password') {
      setShowPasswordModal(true);
    } else if (route) {
      navigation.navigate(route);
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const roleCfg =
    user?.role === 'admin'
      ? { label: 'ADMIN ROLE', color: theme.colors.primary }
      : { label: 'USER ROLE', color: theme.colors.teal };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setShowEditProfileModal(true)}
          activeOpacity={0.7}
        >
          <Feather name="edit" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.avatarWrap, { transform: [{ scale: avatarScaleAnim }] }]}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editAvatarBtn}
                onPress={handlePickAvatar}
                activeOpacity={0.75}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar
                  ? <ActivityIndicator size={10} color="#0D1B2A" />
                  : <Feather name="camera" size={12} color="#0D1B2A" />}
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleCfg.color + '25', borderColor: roleCfg.color + '40' }]}>
              <Text style={[styles.roleText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatPill value={orderCount.toString()} label="ORDERS" index={0} />
            <View style={styles.statDivider} />
            <StatPill value={rating.toFixed(1)} label="RATING" index={1} />
            <View style={styles.statDivider} />
            <StatPill value="12" label="SHIFTS" index={2} />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.actionsCard}>
            {QUICK_ACTIONS.map((action, index) => (
              <ActionRow
                key={action.label}
                {...action}
                index={index}
                isLast={index === QUICK_ACTIONS.length - 1}
                onPress={() => handleActionPress(action.route, action.label)}
              />
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={18} color={theme.colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <EditProfileModal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        currentName={user?.name || ''}
        userId={user?.id || ''}
      />
    </View>
  );
}

// ─── Change Password Modal ─────────────────────────────────
const ChangePasswordModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reset = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setErrors({}); setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const validate = () => {
    const e: typeof errors = {};
    if (!currentPassword) e.current = 'Current password is required.';
    if (!newPassword || newPassword.length < 6) e.new = 'New password must be at least 6 characters.';
    if (newPassword !== confirmPassword) e.confirm = 'Passwords do not match.';
    if (newPassword && currentPassword && newPassword === currentPassword) e.new = 'New password must be different from current.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error('Unable to verify current session.');

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) {
        setErrors({ current: 'Current password is incorrect.' });
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: handleClose },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconWrap, { backgroundColor: theme.colors.teal + '20' }]}>
              <Feather name="lock" size={20} color={theme.colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Text style={styles.modalSubtitle}>Update your account password</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
              <Feather name="x" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalFieldLabel}>Current Password</Text>
          <View style={[styles.modalInputWrap, errors.current && styles.inputError]}>
            <Feather name="lock" size={15} color={theme.colors.textMuted} />
            <TextInput
              style={styles.modalInput}
              placeholder="Enter current password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setErrors(e => ({ ...e, current: undefined })); }}
            />
            <TouchableOpacity onPress={() => setShowCurrent(v => !v)}>
              <Feather name={showCurrent ? 'eye-off' : 'eye'} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          {errors.current && <Text style={styles.errorText}>{errors.current}</Text>}

          <Text style={styles.modalFieldLabel}>New Password</Text>
          <View style={[styles.modalInputWrap, errors.new && styles.inputError]}>
            <Feather name="key" size={15} color={theme.colors.textMuted} />
            <TextInput
              style={styles.modalInput}
              placeholder="At least 6 characters"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setErrors(e => ({ ...e, new: undefined })); }}
            />
            <TouchableOpacity onPress={() => setShowNew(v => !v)}>
              <Feather name={showNew ? 'eye-off' : 'eye'} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          {errors.new && <Text style={styles.errorText}>{errors.new}</Text>}

          <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
          <View style={[styles.modalInputWrap, errors.confirm && styles.inputError]}>
            <Feather name="check-circle" size={15} color={theme.colors.textMuted} />
            <TextInput
              style={styles.modalInput}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors(e => ({ ...e, confirm: undefined })); }}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
              <Feather name={showConfirm ? 'eye-off' : 'eye'} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          {errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}

          <TouchableOpacity
            style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.teal }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.modalSubmitText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Edit Profile Modal ────────────────────────────────────
const EditProfileModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  currentName: string;
  userId: string;
}> = ({ visible, onClose, currentName, userId }) => {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setName(currentName); }, [currentName, visible]);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ name: name.trim() });
      await supabase.auth.updateUser({ data: { name: name.trim() } });
      Alert.alert('Profile Updated', 'Your display name has been updated.', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (e: any) {
      setError(e.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconWrap, { backgroundColor: theme.colors.primary + '20' }]}>
              <Feather name="user" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Text style={styles.modalSubtitle}>Update your display name</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Feather name="x" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalFieldLabel}>Display Name</Text>
          <View style={[styles.modalInputWrap, error ? styles.inputError : null]}>
            <Feather name="user" size={15} color={theme.colors.textMuted} />
            <TextInput
              style={styles.modalInput}
              placeholder="Your full name"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={(t) => { setName(t); setError(''); }}
              autoCapitalize="words"
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0D1B2A" size="small" />
              : <Text style={[styles.modalSubmitText, { color: '#0D1B2A' }]}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Stat Pill ─────────────────────────────────────────────
const StatPill: React.FC<{ value: string; label: string; index: number }> = ({ value, label, index }) => {
  const countAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 120, useNativeDriver: true }),
      Animated.spring(countAnim, { toValue: 1, delay: index * 120, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.statPill, { opacity: opacityAnim, transform: [{ scale: countAnim }] }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

// ─── Action Row ────────────────────────────────────────────
const ActionRow: React.FC<{
  label: string; icon: keyof typeof Feather.glyphMap;
  color: string; index: number; isLast: boolean; onPress: () => void;
}> = ({ label, icon, color, index, isLast, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: 200 + index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: 200 + index * 80, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  return (
    <Animated.View style={[styles.actionRow, !isLast && styles.actionRowBorder, { opacity: opacityAnim, transform: [{ translateY: slideAnim }, { scale }] }]}>
      <TouchableOpacity style={styles.actionRowInner} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={[styles.actionIconWrap, { backgroundColor: color + '20' }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
        <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingTop: 56, paddingBottom: theme.spacing.md,
  },
  topBarTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  settingsBtn: {
    width: 40, height: 40, backgroundColor: theme.colors.surface,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  scrollContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatarImage: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: theme.colors.primary + '60', ...theme.shadows.medium,
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: theme.colors.primary + '30', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: theme.colors.primary + '60', ...theme.shadows.medium,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: theme.colors.primary },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.colors.background,
  },
  userName: { fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3, marginBottom: 4 },
  userEmail: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: theme.borderRadius.full, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  statsRow: {
    flexDirection: 'row', backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large, padding: theme.spacing.md,
    marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.small,
  },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textMuted,
    letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: theme.spacing.md,
  },
  actionsCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.xl,
    overflow: 'hidden', ...theme.shadows.small,
  },
  actionRow: {},
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionRowInner: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: 16,
  },
  actionIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: theme.colors.error + '15', borderRadius: theme.borderRadius.large,
    paddingVertical: 16, borderWidth: 1, borderColor: theme.colors.error + '30',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: theme.colors.error },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg, paddingBottom: 36, borderWidth: 1, borderColor: theme.colors.border,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border, marginBottom: theme.spacing.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  modalIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
  modalSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center',
  },
  modalFieldLabel: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: theme.spacing.sm,
  },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.md, height: 48, borderWidth: 1, borderColor: theme.colors.border,
  },
  inputError: { borderColor: theme.colors.error },
  modalInput: { flex: 1, fontSize: 14, color: theme.colors.text, height: '100%' },
  errorText: { fontSize: 12, color: theme.colors.error, marginTop: 4, marginLeft: 4 },
  modalSubmitBtn: {
    marginTop: theme.spacing.lg, borderRadius: theme.borderRadius.large,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center', ...theme.shadows.medium,
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});