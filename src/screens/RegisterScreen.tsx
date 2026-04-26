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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Input, Button, BackgroundTexture } from '../components/UIComponents';
import { theme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const dotAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    dotAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -10, duration: 3000, delay: i * 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const validate = () => {
    const newErrors: { name?: string; email?: string; password?: string } = {};
    if (!name.trim() || name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters.';
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email.';
    if (!password) newErrors.password = 'Password is required.';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      // register() only throws 'CONFIRM_EMAIL' if email confirmation is required
      // If we reach here without an error, the user was signed in automatically
      // (email confirmation is off) — the AuthContext listener will handle navigation.
    } catch (error: any) {
      if (error.message === 'CONFIRM_EMAIL') {
        // Email confirmation required — tell the user and go to login
        Alert.alert(
          'Check your email',
          'A confirmation link has been sent to ' + email.trim() + '. Please confirm your email before signing in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else if (error.message.toLowerCase().includes('rate limit')) {
        setErrors({ email: 'Too many attempts. Please try again in an hour.' });
      } else if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        setErrors({ email: 'An account with this email already exists. Please sign in instead.' });
      } else {
        setErrors({ password: error.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <BackgroundTexture />

      <View style={styles.topSection}>
        <View style={styles.topPattern}>
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.patternDot,
                { opacity: 0.05 + i * 0.02, top: (i % 3) * 60, left: i * 55, transform: [{ translateY: dotAnims[i] }] },
              ]}
            />
          ))}
        </View>
        <View style={styles.brandRow}>
          <View style={styles.logoIcon}>
            <Feather name="zap" size={28} color="#0D1B2A" />
          </View>
        </View>
        <Text style={styles.brandName}>Create account</Text>
        <Text style={styles.brandTagline}>Register to manage orders and view your menu.</Text>
      </View>

      <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.fieldLabel}>Full Name</Text>
          <Input
            placeholder="John Doe"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setErrors((e) => ({ ...e, name: undefined }));
            }}
            autoCapitalize="words"
            error={errors.name}
            icon="user"
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <Input
            placeholder="your@email.com"
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

          <View style={{ marginTop: theme.spacing.sm }}>
            <Button title="Create Account" onPress={handleRegister} loading={isSubmitting} />
          </View>

          <View style={styles.infoRow}>
            <Feather name="info" size={13} color={theme.colors.teal} />
            <Text style={styles.infoText}>A new account will be stored in Supabase and can be signed in immediately.</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.75} style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  infoText: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  switchRow: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});