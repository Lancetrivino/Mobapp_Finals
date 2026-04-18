import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  TextInput,
  ActivityIndicator,
  KeyboardTypeOptions,
} from 'react-native';
import { theme } from '../utils/theme';

// Button Component
export const Button: React.FC<{
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger';
}> = ({ title, onPress, loading = false, disabled = false, variant = 'primary' }) => {
  const buttonStyles = [
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'outline' && styles.buttonOutline,
    variant === 'success' && styles.buttonSuccess,
    variant === 'danger' && styles.buttonDanger,
    disabled && styles.buttonDisabled,
  ];

  const textStyles = [
    styles.buttonText,
    variant === 'outline' && styles.buttonOutlineText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : '#fff'} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

// Input Component
export const Input: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  error?: string;
}> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
}) => {
  return (
    <>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.gray}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize as any}
          keyboardType={keyboardType}
        />
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </>
  );
};

// Card Component
export const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

// Header Component
export const Header: React.FC<{ title: string; subtitle?: string; icon?: string }> = ({
  title,
  subtitle,
  icon,
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{icon ? `${icon} ` : ''}{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

// Stat Card Component
export const StatCard: React.FC<{
  label: string;
  value: string;
  icon?: string;
  color?: string;
}> = ({ label, value, icon, color = theme.colors.primary }) => {
  const backgroundColor = color + '15';
  return (
    <View style={[styles.statCard, { backgroundColor }]}>
      {icon && <Text style={styles.statIcon}>{icon}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
};

// Menu Item Card
export const MenuItemCard: React.FC<{
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  onOrder: () => void;
}> = ({ name, description, price, category, available, onOrder }) => {
  return (
    <Card style={styles.menuItemCard}>
      <View style={styles.menuItemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuItemName}>{name}</Text>
          <Text style={styles.menuItemCategory}>{category}</Text>
        </View>
        <Text style={styles.menuItemPrice}>₱{price.toFixed(2)}</Text>
      </View>
      <Text style={styles.menuItemDescription}>{description}</Text>
      <TouchableOpacity
        style={[styles.menuItemButton, !available && styles.menuItemButtonDisabled]}
        onPress={onOrder}
        disabled={!available}
      >
        <Text style={styles.menuItemButtonText}>
          {available ? '🛒 Order' : '❌ Out of Stock'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  // Button Styles
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginVertical: theme.spacing.xs,
    ...theme.shadows.small,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.secondary,
  },
  buttonSuccess: {
    backgroundColor: theme.colors.success,
  },
  buttonDanger: {
    backgroundColor: theme.colors.error,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonOutlineText: {
    color: theme.colors.primary,
  },

  // Input Styles
  inputContainer: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.white,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  input: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.dark,
  },
  inputError: {
    color: theme.colors.error,
    fontSize: 13,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
    fontWeight: '500',
  },

  // Card Styles
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // Header Styles
  headerContainer: {
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primaryLight,
  },
  headerContent: {
    gap: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.dark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '500',
  },

  // Stat Card Styles
  statCard: {
    flex: 1,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },

  // Menu Item Card Styles
  menuItemCard: {
    marginBottom: theme.spacing.md,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  menuItemCategory: {
    fontSize: 12,
    color: theme.colors.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  menuItemDescription: {
    fontSize: 13,
    color: theme.colors.gray,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  menuItemButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  menuItemButtonDisabled: {
    backgroundColor: theme.colors.grayLight,
    opacity: 0.6,
  },
  menuItemButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
