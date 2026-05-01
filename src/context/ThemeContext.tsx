import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, darkTheme, lightTheme, ThemeMode } from '../utils/theme';

const STORAGE_KEY = 'APP_THEME_MODE';

export type ThemeContextType = {
  mode: ThemeMode;
  theme: AppTheme;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setModeState(stored);
        }
      } catch (error) {
        console.warn('[ThemeProvider] Unable to load theme mode:', error);
      }
    };
    loadTheme();
  }, []);

  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

  const persistMode = useCallback(async (nextMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch (error) {
      console.warn('[ThemeProvider] Unable to persist theme mode:', error);
    }
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await persistMode(nextMode);
  }, [persistMode]);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      persistMode(next);
      return next;
    });
  }, [persistMode]);

  const value = useMemo(
    () => ({
      mode,
      theme,
      toggleTheme,
      setMode,
    }),
    [mode, theme, toggleTheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
};
