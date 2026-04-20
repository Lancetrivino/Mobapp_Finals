import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Input, Button } from '../components/UIComponents';
import { theme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'User'>('Admin');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Mount animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email.';
    if (!password) newErrors.password = 'Password is required.';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoggingIn(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      if (error.message.toLowerCase().includes('rate limit')) {
        setErrors({ email: 'Too many attempts. Please try again in an hour.' });
      } else {
        setErrors({ password: error.message || 'Invalid credentials. Please try again.' });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Top decorative section */}
      <View style={styles.topSection}>
        <View style={styles.topPattern}>
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.patternDot,
                { opacity: 0.05 + i * 0.02, top: (i % 3) * 60, left: i * 55 },
              ]}
            />
          ))}
        </View>
        <View style={styles.brandRow}>
          <View style={styles.logoIcon}>
            <Feather name="zap" size={28} color="#0D1B2A" />
          </View>
        </View>
        <Text style={styles.brandName}>DineFlow</Text>
        <Text style={styles.brandTagline}>Local-First Management System</Text>
      </View>

      {/* Form section */}
      <Animated.View
        style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role Toggle */}
          <Text style={styles.fieldLabel}>Access Role</Text>
          <View style={styles.roleToggleRow}>
            {(['Admin', 'User'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Email */}
          <Text style={styles.fieldLabel}>User Email</Text>
          <Input
            placeholder={role === 'Admin' ? 'admin@dineflow.local' : 'user@dineflow.local'}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrors((e) => ({ ...e, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            icon="mail"
          />

          {/* Password */}
          <Text style={styles.fieldLabel}>Password</Text>
          <Input
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            secureTextEntry
            error={errors.password}
            icon="lock"
          />

          {/* Sign In Button */}
          <View style={{ marginTop: theme.spacing.sm }}>
            <Button title="Sign In" onPress={handleLogin} loading={isLoggingIn} />
          </View>

          <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('Register')} activeOpacity={0.75}>
            <Text style={styles.switchText}>Create a new account</Text>
          </TouchableOpacity>

          {/* Local storage info */}
          <View style={styles.infoRow}>
            <Feather name="hard-drive" size={13} color={theme.colors.teal} />
            <Text style={styles.infoText}>Local storage active. No cloud connection required.</Text>
          </View>

          {/* Demo credentials hint */}
          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>Demo Credentials</Text>
            <View style={styles.demoRow}>
              <Text style={styles.demoLabel}>Admin</Text>
              <Text style={styles.demoValue}>admin@rms.com / admin123</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  topSection: {
    backgroundColor: theme.colors.background,
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  topPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternDot: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
  },
  brandRow: {
    marginBottom: 16,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.medium,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -1,
    marginBottom: 6,
  },
  brandTagline: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  formSection: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...theme.shadows.large,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 40,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },

  roleToggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: 4,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.medium - 2,
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.small,
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  roleBtnTextActive: {
    color: '#0D1B2A',
  },

  switchRow: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  switchText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.teal,
    fontWeight: '500',
  },

  demoCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  demoValue: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
