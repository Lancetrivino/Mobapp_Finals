import React, { useRef, useEffect, memo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  TextInput,
  ActivityIndicator,
  KeyboardTypeOptions,
  ViewStyle,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { theme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

// ─── Animated Button ───────────────────────────────────────
export const Button: React.FC<{
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger';
  icon?: keyof typeof Feather.glyphMap;
}> = memo(({ title, onPress, loading = false, disabled = false, variant = 'primary', icon }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  const bgMap: Record<string, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.surfaceHigh,
    success: theme.colors.success,
    danger: theme.colors.error,
    outline: 'transparent',
  };

  const textColorMap: Record<string, string> = {
    primary: '#0D1B2A',
    secondary: theme.colors.text,
    success: '#FFFFFF',
    danger: '#FFFFFF',
    outline: theme.colors.primary,
  };

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.5 : 1 }}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: bgMap[variant] ?? theme.colors.primary },
          variant === 'outline' && styles.buttonOutline,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#0D1B2A' : theme.colors.primary} size="small" />
        ) : (
          <View style={styles.buttonInner}>
            {icon && <Feather name={icon} size={16} color={textColorMap[variant]} style={{ marginRight: 6 }} />}
            <Text style={[styles.buttonText, { color: textColorMap[variant] }]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Input ─────────────────────────────────────────────────
export const Input: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
}> = memo(({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
  icon,
}) => {
  return (
    <>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        {icon && (
          <View style={styles.inputIconWrap}>
            <Feather name={icon} size={16} color={theme.colors.textSecondary} />
          </View>
        )}
        <TextInput
          style={[styles.input, icon && { paddingLeft: 0 }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize as any}
          keyboardType={keyboardType}
        />
      </View>
      {error && (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={12} color={theme.colors.error} />
          <Text style={styles.inputError}>{error}</Text>
        </View>
      )}
    </>
  );
});

// ─── Card ──────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = memo(
  ({ children, style }) => <View style={[styles.card, style]}>{children}</View>
);

// ─── Animated Card (for lists) ─────────────────────────────
export const AnimatedCard: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
  index?: number;
}> = memo(({ children, style, index = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 70,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
});

// ─── Header ────────────────────────────────────────────────
export const Header: React.FC<{ title: string; subtitle?: string }> = memo(({ title, subtitle }) => (
  <View style={styles.headerContainer}>
    <Text style={styles.headerTitle}>{title}</Text>
    {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
  </View>
));

// ─── Section Label ─────────────────────────────────────────
export const SectionLabel: React.FC<{ label: string }> = memo(({ label }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
));

// ─── Stat Card ─────────────────────────────────────────────
export const StatCard: React.FC<{
  label: string;
  value: string;
  iconName?: keyof typeof Feather.glyphMap;
  color?: string;
  subtitle?: string;
}> = memo(({ label, value, iconName, color = theme.colors.primary, subtitle }) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        { borderColor: color + '30' },
        { opacity, transform: [{ scale }] },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
        {iconName && <Feather name={iconName} size={20} color={color} />}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </Animated.View>
  );
});

// ─── Menu Item Card (admin list view) ──────────────────────
export const MenuItemCard: React.FC<{
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  onOrder: () => void;
}> = memo(({ name, description, price, category, available, onOrder }) => (
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
      activeOpacity={0.75}
    >
      <Text style={[styles.menuItemButtonText, !available && { color: theme.colors.textMuted }]}>
        {available ? '+ Add to Order' : 'Out of Stock'}
      </Text>
    </TouchableOpacity>
  </Card>
));

// ─── Badge ─────────────────────────────────────────────────
export const Badge: React.FC<{ label: string; color: string }> = memo(({ label, color }) => (
  <View style={[styles.badge, { backgroundColor: color + '25', borderColor: color + '50' }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
));

// ─── Background Texture ────────────────────────────────────
// Heavy SVG — rendered once, memoized
export const BackgroundTexture: React.FC = memo(() => {
  const { width, height } = Dimensions.get('window');
  return (
    <Svg
      style={StyleSheet.absoluteFillObject as any}
      width={width}
      height={height}
      pointerEvents="none"
    >
      <Defs>
        <Pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <Circle cx="10" cy="10" r="1" fill="rgba(220,160,140,0.06)" />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#dots)" />
    </Svg>
  );
});

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginVertical: theme.spacing.xs,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  inputIconWrap: {
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  inputError: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '500',
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },

  headerContainer: {
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },

  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    borderWidth: 1,
    ...theme.shadows.medium,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  statSubtitle: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: '600',
    marginTop: 2,
  },

  menuItemCard: {
    marginBottom: theme.spacing.md,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  menuItemCategory: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  menuItemDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  menuItemButton: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  menuItemButtonDisabled: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  menuItemButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});