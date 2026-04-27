import { theme } from './theme';
import { Feather } from '@expo/vector-icons';

export const ORDER_STATUS_CONFIG: Record<string, {
  color: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = {
  pending:   { color: theme.colors.warning, label: 'Pending',        icon: 'clock' },
  confirmed: { color: theme.colors.blue,    label: 'Confirmed',      icon: 'check' },
  preparing: { color: theme.colors.accent,  label: 'In Preparation', icon: 'zap' },
  ready:     { color: theme.colors.success, label: 'Ready to Serve', icon: 'check-circle' },
  completed: { color: theme.colors.success, label: 'Served',         icon: 'check-circle' },
  cancelled: { color: theme.colors.error,   label: 'Cancelled',      icon: 'x-circle' },
};
