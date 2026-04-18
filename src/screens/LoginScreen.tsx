import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Text, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UIComponents';
import { theme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login, isLoading } = useAuth();

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
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      setErrors({ password: error.message || 'Login failed. Please try again.' });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Feather name="grid" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Restaurant</Text>
          <Text style={styles.subtitle}>Management System</Text>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Input
            placeholder="Email Address"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
            secureTextEntry
            error={errors.password}
          />

          <Button 
            title={isLoading ? "Signing In..." : "Sign In"} 
            onPress={handleLogin} 
            loading={isLoading} 
          />
        </View>

        {/* Credentials Card */}
        <View style={styles.credentialsCard}>
          <Text style={styles.credentialsTitle}>Demo Credentials</Text>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Admin:</Text>
            <Text style={styles.credentialValue}>admin@rms.com</Text>
          </View>
          <View style={styles.credentialDivider} />
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Password:</Text>
            <Text style={styles.credentialValue}>admin123</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '500',
  },

  // Form Section
  formSection: {
    marginBottom: theme.spacing.xl,
  },

  // Credentials Card
  credentialsCard: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  credentialsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  credentialLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryDark,
  },
  credentialValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
  },
  credentialDivider: {
    height: 1,
    backgroundColor: theme.colors.primary + '40',
    marginVertical: theme.spacing.xs,
  },
});