import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';
import { ActionButton } from './ActionButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 400 }}
      style={styles.container}
    >
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.accentSubtle }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      )}
      <Text style={[styles.title, { color: theme.colors.textSecondary }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.colors.textMuted }]}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <ActionButton label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  action: {
    marginTop: 20,
  },
});
