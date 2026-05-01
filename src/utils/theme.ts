export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  colors: {
    background: string;
    surface: string;
    surfaceHigh: string;
    surfaceModal: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    errorLight: string;
    teal: string;
    tealLight: string;
    blue: string;
    blueLight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderStrong: string;
    overlay: string;
    white: string;
    dark: string;
    gray: string;
    grayLight: string;
    grayDark: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    light: string;
    background2: string;
    border2: string;
  };
  fonts: {
    regular: 'normal';
    bold: 'bold';
    semibold: '600';
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
    xl: number;
    full: number;
  };
  shadows: {
    small: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    medium: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    large: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
  typography: {
    h1: { fontSize: number; fontWeight: '700'; lineHeight: number };
    h2: { fontSize: number; fontWeight: '700'; lineHeight: number };
    h3: { fontSize: number; fontWeight: '700'; lineHeight: number };
    h4: { fontSize: number; fontWeight: '700'; lineHeight: number };
    body: { fontSize: number; fontWeight: '400'; lineHeight: number };
    bodySm: { fontSize: number; fontWeight: '400'; lineHeight: number };
    label: { fontSize: number; fontWeight: '600'; lineHeight: number };
  };
};

const baseTheme = {
  fonts: {
    regular: 'normal' as const,
    bold: 'bold' as const,
    semibold: '600' as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xl: 20,
    full: 9999,
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 14,
    },
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
    h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
    h3: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
    h4: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  },
};

export const darkTheme: AppTheme = {
  ...baseTheme,
  colors: {
    background: '#160A0E',
    surface: '#1F0E14',
    surfaceHigh: '#2A1220',
    surfaceModal: '#221018',
    primary: '#E8B86D',
    primaryDark: '#D4A050',
    primaryLight: 'rgba(232,184,109,0.15)',
    accent: '#D4706A',
    accentLight: 'rgba(212,112,106,0.15)',
    success: '#10B981',
    successLight: 'rgba(16,185,129,0.15)',
    warning: '#F59E0B',
    warningLight: 'rgba(245,158,11,0.15)',
    error: '#EF4444',
    errorLight: 'rgba(239,68,68,0.15)',
    teal: '#14B8A6',
    tealLight: 'rgba(20,184,166,0.15)',
    blue: '#3B82F6',
    blueLight: 'rgba(59,130,246,0.15)',
    text: '#FFF8F5',
    textSecondary: '#C4906A',
    textMuted: '#7A5545',
    border: 'rgba(220,160,140,0.10)',
    borderStrong: 'rgba(220,160,140,0.20)',
    overlay: 'rgba(0,0,0,0.80)',
    white: '#FFFFFF',
    dark: '#FFF8F5',
    gray: '#7A5545',
    grayLight: '#2A1220',
    grayDark: '#C4906A',
    secondary: '#3B82F6',
    secondaryLight: 'rgba(59,130,246,0.15)',
    secondaryDark: '#2563EB',
    light: '#2A1220',
    background2: '#160A0E',
    border2: 'rgba(220,160,140,0.10)',
  },
};

export const lightTheme: AppTheme = {
  ...baseTheme,
  colors: {
    background: '#F7F5F1',
    surface: '#FFFFFF',
    surfaceHigh: '#F3E9DD',
    surfaceModal: '#F9F7F2',
    primary: '#E8B86D',
    primaryDark: '#D4A050',
    primaryLight: 'rgba(232,184,109,0.15)',
    accent: '#D4706A',
    accentLight: 'rgba(212,112,106,0.15)',
    success: '#10B981',
    successLight: 'rgba(16,185,129,0.15)',
    warning: '#F59E0B',
    warningLight: 'rgba(245,158,11,0.15)',
    error: '#EF4444',
    errorLight: 'rgba(239,68,68,0.15)',
    teal: '#14B8A6',
    tealLight: 'rgba(20,184,166,0.15)',
    blue: '#3B82F6',
    blueLight: 'rgba(59,130,246,0.15)',
    text: '#1F1C1A',
    textSecondary: '#7A6B5F',
    textMuted: '#8A7D74',
    border: 'rgba(31,27,24,0.12)',
    borderStrong: 'rgba(31,27,24,0.18)',
    overlay: 'rgba(0,0,0,0.4)',
    white: '#FFFFFF',
    dark: '#1F1C1A',
    gray: '#8A7D74',
    grayLight: '#F3E9DD',
    grayDark: '#B38A63',
    secondary: '#2563EB',
    secondaryLight: 'rgba(59,130,246,0.15)',
    secondaryDark: '#1D4ED8',
    light: '#F3E8FF',
    background2: '#F1ECE6',
    border2: 'rgba(31,27,24,0.1)',
  },
};

export const theme = darkTheme;
