import { Platform } from 'react-native';

// --- Colors ---------------------------------------------------------------

export const palette = {
  // Neutrals (dark mode primary)
  black: '#000000',
  gray950: '#09090B',
  gray900: '#111114',
  gray850: '#18181C',
  gray800: '#27272A',
  gray750: '#1C1C20',
  gray600: '#52525B',
  gray400: '#A1A1AA',
  gray200: '#E4E4E7',
  gray100: '#F4F4F5',
  gray50: '#FAFAFA',
  white: '#FFFFFF',

  // Accent
  green400: '#00E5A0',
  green400_20: 'rgba(0, 229, 160, 0.20)',
  green400_10: 'rgba(0, 229, 160, 0.10)',

  // Semantic
  amber400: '#FBBF24',
  amber400_20: 'rgba(251, 191, 36, 0.20)',
  red500: '#EF4444',
  red500_20: 'rgba(239, 68, 68, 0.20)',
  indigo400: '#818CF8',
  indigo400_20: 'rgba(129, 140, 248, 0.20)',
} as const;

export const darkColors = {
  bgPrimary: palette.gray950,
  bgSurface: palette.gray900,
  bgElevated: palette.gray850,

  borderDefault: palette.gray800,
  borderSubtle: palette.gray750,

  textPrimary: palette.gray50,
  textSecondary: palette.gray400,
  textMuted: palette.gray600,

  accent: palette.green400,
  accentDim: palette.green400_20,
  accentSubtle: palette.green400_10,

  warning: palette.amber400,
  warningDim: palette.amber400_20,
  danger: palette.red500,
  dangerDim: palette.red500_20,
  info: palette.indigo400,
  infoDim: palette.indigo400_20,

  tabBarBg: palette.gray900,
  tabBarBorder: palette.gray800,
  tabBarInactive: palette.gray600,
  tabBarActive: palette.green400,
} as const;

export const lightColors = {
  bgPrimary: palette.gray50,
  bgSurface: palette.white,
  bgElevated: palette.white,

  borderDefault: palette.gray200,
  borderSubtle: palette.gray100,

  textPrimary: '#1A1A2E',
  textSecondary: '#8E8E9A',
  textMuted: '#B0B0BA',

  accent: '#00C98A',
  accentDim: 'rgba(0, 201, 138, 0.15)',
  accentSubtle: 'rgba(0, 201, 138, 0.08)',

  warning: '#D97706',
  warningDim: 'rgba(217, 119, 6, 0.15)',
  danger: '#DC2626',
  dangerDim: 'rgba(220, 38, 38, 0.15)',
  info: '#6366F1',
  infoDim: 'rgba(99, 102, 241, 0.15)',

  tabBarBg: palette.white,
  tabBarBorder: palette.gray200,
  tabBarInactive: '#B0B0BA',
  tabBarActive: '#00C98A',
} as const;

export type ThemeColors = {
  [K in keyof typeof darkColors]: string;
};

// --- Typography -----------------------------------------------------------

const monoFont = Platform.select({
  ios: 'SF Mono',
  android: 'FiraCode',
  default: 'monospace',
});

const systemFont = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const fonts = {
  mono: monoFont,
  system: systemFont,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const letterSpacing = {
  tight: -0.02,
  normal: 0,
  wide: 0.04,
} as const;

// --- Spacing --------------------------------------------------------------

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// --- Animation ------------------------------------------------------------

export const animationDurations = {
  instant: 100,
  fast: 200,
  normal: 350,
  slow: 500,
  chartDraw: 800,
} as const;

export const springConfigs = {
  normal: { damping: 15, stiffness: 120 },
  slow: { damping: 20, stiffness: 80 },
  snappy: { damping: 20, stiffness: 200 },
  gentle: { damping: 25, stiffness: 60 },
} as const;

export const staggerOffset = 40; // ms per item in animated lists
