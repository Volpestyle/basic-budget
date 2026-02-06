import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../state/store';

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useAppStore((state) => state.settings);
  const loadSettings = useAppStore((state) => state.loadSettings);

  useEffect(() => {
    if (!settings) {
      void loadSettings();
    }
  }, [loadSettings, settings]);

  const cycleValue = settings?.cycleType === 'biweekly' ? 'Biweekly' : 'Monthly';
  const weekStartValue = settings ? WEEKDAY_LABELS[settings.weekStart] ?? 'Monday' : '--';
  const currencyValue = settings?.currency ?? 'USD';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>CONFIG</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.row, { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.borderDefault }]}> 
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>Budget cycle</Text>
          <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{cycleValue}</Text>
        </View>
        <View style={[styles.row, { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.borderDefault }]}> 
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>Week starts</Text>
          <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{weekStartValue}</Text>
        </View>
        <View style={[styles.row, { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.borderDefault }]}> 
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>Currency</Text>
          <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{currencyValue}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 15,
  },
});
