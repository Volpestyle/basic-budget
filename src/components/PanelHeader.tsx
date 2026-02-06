import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface PanelHeaderProps {
  label: string;
  right?: React.ReactNode;
}

export function PanelHeader({ label, right }: PanelHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.borderSubtle }]}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
