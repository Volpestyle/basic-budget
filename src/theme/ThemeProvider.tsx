import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  darkColors,
  lightColors,
  fonts,
  fontSizes,
  fontWeights,
  letterSpacing,
  spacing,
  radii,
  animationDurations,
  springConfigs,
  staggerOffset,
} from './tokens';
import type { ThemeColors } from './tokens';

export type ColorMode = 'dark' | 'light' | 'system';

export interface Theme {
  colors: ThemeColors;
  fonts: typeof fonts;
  fontSizes: typeof fontSizes;
  fontWeights: typeof fontWeights;
  letterSpacing: typeof letterSpacing;
  spacing: typeof spacing;
  radii: typeof radii;
  animation: {
    durations: typeof animationDurations;
    springs: typeof springConfigs;
    staggerOffset: number;
  };
  isDark: boolean;
}

interface ThemeContextValue {
  theme: Theme;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>('dark');

  const isDark = colorMode === 'system' ? systemScheme !== 'light' : colorMode === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      fonts,
      fontSizes,
      fontWeights,
      letterSpacing,
      spacing,
      radii,
      animation: {
        durations: animationDurations,
        springs: springConfigs,
        staggerOffset,
      },
      isDark,
    }),
    [isDark],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colorMode, setColorMode }),
    [theme, colorMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
