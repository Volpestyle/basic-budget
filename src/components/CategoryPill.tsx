import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface CategoryPillProps {
  name: string;
  color: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function CategoryPill({ name, color, selected = false, onPress }: CategoryPillProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? `${color}20` : theme.colors.bgSurface,
          borderColor: selected ? color : theme.colors.borderDefault,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.label,
          { color: selected ? color : theme.colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
