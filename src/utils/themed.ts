import { useMemo } from 'react';
import { AppTheme } from './theme';

export function useThemedStyles<T>(factory: (theme: AppTheme) => T, theme: AppTheme): T {
  return useMemo(() => factory(theme), [factory, theme]);
}