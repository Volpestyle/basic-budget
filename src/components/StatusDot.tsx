import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { PaceStatus } from '../types/domain';
import { useTheme } from '../theme/ThemeProvider';

interface StatusDotProps {
  status: PaceStatus;
  size?: number;
}

export function StatusDot({ status, size = 8 }: StatusDotProps) {
  const theme = useTheme();

  const colorMap: Record<PaceStatus, string> = {
    on_track: theme.colors.accent,
    warning: theme.colors.warning,
    overspent: theme.colors.danger,
  };

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorMap[status],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
