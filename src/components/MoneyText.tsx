import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import type { MoneyCents } from '../types/domain';
import { useTheme } from '../theme/ThemeProvider';

interface MoneyTextProps {
  value: MoneyCents;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: string;
  showSign?: boolean;
  showCents?: boolean;
  animated?: boolean;
}

const sizeMap = {
  sm: 13,
  md: 20,
  lg: 28,
  xl: 34,
  '2xl': 40,
} as const;

const weightMap = {
  sm: '600' as const,
  md: '700' as const,
  lg: '700' as const,
  xl: '700' as const,
  '2xl': '700' as const,
};

function formatCents(cents: number, showSign: boolean, showCents: boolean): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const sign = cents < 0 ? '-' : showSign && cents > 0 ? '+' : '';
  const formatted = dollars.toLocaleString('en-US');
  if (showCents) {
    return `${sign}$${formatted}.${String(remainder).padStart(2, '0')}`;
  }
  return `${sign}$${formatted}`;
}

export function MoneyText({
  value,
  size = 'md',
  color,
  showSign = false,
  showCents = true,
  animated = true,
}: MoneyTextProps) {
  const theme = useTheme();
  const displayColor = color ?? theme.colors.textPrimary;
  const fontSize = sizeMap[size];
  const fontWeight = weightMap[size];

  const animatedValue = useSharedValue(value as number);
  const [displayText, setDisplayText] = useState(() =>
    formatCents(value as number, showSign, showCents),
  );

  useEffect(() => {
    if (animated) {
      animatedValue.value = withTiming(value as number, { duration: 350 });
    } else {
      animatedValue.value = value as number;
      setDisplayText(formatCents(value as number, showSign, showCents));
    }
  }, [value, animated, animatedValue, showSign, showCents]);

  useAnimatedReaction(
    () => Math.round(animatedValue.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayText)(formatCents(current, showSign, showCents));
      }
    },
    [showSign, showCents],
  );

  return (
    <Text
      style={[
        styles.text,
        {
          fontSize,
          fontWeight,
          color: displayColor,
          fontFamily: theme.fonts.mono,
        },
      ]}
    >
      {displayText}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    letterSpacing: -0.5,
  },
});
