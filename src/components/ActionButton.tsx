import React from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}: ActionButtonProps) {
  const theme = useTheme();

  const bgMap = {
    primary: theme.colors.accent,
    secondary: theme.colors.bgSurface,
    danger: theme.colors.danger,
  };

  const textMap = {
    primary: theme.colors.bgPrimary,
    secondary: theme.colors.textPrimary,
    danger: theme.colors.bgPrimary,
  };

  const borderMap = {
    primary: 'transparent',
    secondary: theme.colors.borderDefault,
    danger: 'transparent',
  };

  const isDisabled = disabled || loading;

  return (
    <MotiView
      from={{ scale: 1 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: bgMap[variant],
            borderColor: borderMap[variant],
            opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
            alignSelf: fullWidth ? 'stretch' : 'center',
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textMap[variant]} />
        ) : (
          <Text style={[styles.label, { color: textMap[variant] }]}>{label}</Text>
        )}
      </Pressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
});
