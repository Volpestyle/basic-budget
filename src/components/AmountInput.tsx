import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import type { MoneyCents } from '../types/domain';
import { useTheme } from '../theme/ThemeProvider';

interface AmountInputProps {
  value: MoneyCents;
  onChange: (value: MoneyCents) => void;
  autoFocus?: boolean;
  size?: 'md' | 'lg';
  isNegative?: boolean;
  onToggleSign?: () => void;
}

export function AmountInput({
  value,
  onChange,
  autoFocus = false,
  size = 'lg',
  isNegative = true,
  onToggleSign,
}: AmountInputProps) {
  const theme = useTheme();
  const [rawInput, setRawInput] = useState(() => {
    const abs = Math.abs(value as number);
    if (abs === 0) return '';
    return (abs / 100).toFixed(2);
  });

  const handleChange = useCallback(
    (text: string) => {
      // Strip everything except digits and one decimal
      const cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      const formatted = parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join('')}`
        : cleaned;

      // Limit to 2 decimal places
      const decimalParts = formatted.split('.');
      const limited =
        decimalParts[1] !== undefined && decimalParts[1].length > 2
          ? `${decimalParts[0]}.${decimalParts[1].slice(0, 2)}`
          : formatted;

      setRawInput(limited);

      const parsed = parseFloat(limited);
      if (!isNaN(parsed)) {
        const cents = Math.round(parsed * 100);
        const signed = isNegative ? -cents : cents;
        onChange(signed as MoneyCents);
      } else if (limited === '' || limited === '.') {
        onChange(0 as MoneyCents);
      }
    },
    [isNegative, onChange],
  );

  const fontSize = size === 'lg' ? 48 : 28;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {onToggleSign && (
          <Pressable onPress={onToggleSign} style={styles.signButton}>
            <Text style={[styles.sign, { color: theme.colors.textMuted, fontSize: fontSize * 0.6 }]}>
              {isNegative ? '-' : '+'}
            </Text>
          </Pressable>
        )}
        <Text style={[styles.currency, { color: theme.colors.textMuted, fontSize: fontSize * 0.6 }]}>
          $
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.mono,
              fontSize,
            },
          ]}
          value={rawInput}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.accent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  signButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sign: {
    fontWeight: '300',
  },
  currency: {
    fontWeight: '300',
    marginRight: 2,
  },
  input: {
    fontWeight: '700',
    letterSpacing: -1,
    minWidth: 100,
    textAlign: 'center',
    padding: 0,
  },
});
