import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { useTheme } from '../../theme/ThemeProvider';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ActionButton } from '../../components/ActionButton';
import type { CycleType, WeekDay } from '../../types/domain';

interface OnboardingCycleScreenProps {
  onNext: (cycleType: CycleType, weekStart: WeekDay) => void;
}

export function OnboardingCycleScreen({ onNext }: OnboardingCycleScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [cycleType, setCycleType] = useState<CycleType>('monthly');
  const [weekStart, setWeekStart] = useState<WeekDay>(1); // Monday

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
    >
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
      >
        <Text style={[styles.step, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
          STEP 1 OF 2
        </Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          How do you budget?
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Choose a cycle that matches your income schedule
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 100 }}
        style={styles.cards}
      >
        <Pressable onPress={() => setCycleType('monthly')}>
          <MotiView
            animate={{
              scale: cycleType === 'monthly' ? 1 : 0.97,
              opacity: cycleType === 'monthly' ? 1 : 0.6,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            style={[
              styles.cycleCard,
              {
                backgroundColor: theme.colors.bgSurface,
                borderColor: cycleType === 'monthly' ? theme.colors.accent : theme.colors.borderDefault,
                borderWidth: cycleType === 'monthly' ? 2 : 1,
              },
            ]}
          >
            <Text style={styles.cycleEmoji}>{'\u{1F4C5}'}</Text>
            <Text style={[styles.cycleTitle, { color: theme.colors.textPrimary }]}>Monthly</Text>
            <Text style={[styles.cycleDesc, { color: theme.colors.textSecondary }]}>
              Calendar month, 1st to last day. Best for salaried income.
            </Text>
            {cycleType === 'monthly' && (
              <View style={[styles.selectedBadge, { backgroundColor: theme.colors.accentDim }]}>
                <Text style={[styles.selectedText, { color: theme.colors.accent }]}>Selected</Text>
              </View>
            )}
          </MotiView>
        </Pressable>

        <Pressable onPress={() => setCycleType('biweekly')}>
          <MotiView
            animate={{
              scale: cycleType === 'biweekly' ? 1 : 0.97,
              opacity: cycleType === 'biweekly' ? 1 : 0.6,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            style={[
              styles.cycleCard,
              {
                backgroundColor: theme.colors.bgSurface,
                borderColor: cycleType === 'biweekly' ? theme.colors.accent : theme.colors.borderDefault,
                borderWidth: cycleType === 'biweekly' ? 2 : 1,
              },
            ]}
          >
            <Text style={styles.cycleEmoji}>{'\u{1F4B0}'}</Text>
            <Text style={[styles.cycleTitle, { color: theme.colors.textPrimary }]}>Biweekly</Text>
            <Text style={[styles.cycleDesc, { color: theme.colors.textSecondary }]}>
              Every 2 weeks from your payday. Best for hourly or biweekly pay.
            </Text>
            {cycleType === 'biweekly' && (
              <View style={[styles.selectedBadge, { backgroundColor: theme.colors.accentDim }]}>
                <Text style={[styles.selectedText, { color: theme.colors.accent }]}>Selected</Text>
              </View>
            )}
          </MotiView>
        </Pressable>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
        style={styles.weekStartSection}
      >
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          WEEK STARTS ON
        </Text>
        <SegmentedControl
          options={[
            { label: 'Monday', value: '1' },
            { label: 'Sunday', value: '0' },
            { label: 'Saturday', value: '6' },
          ]}
          selected={String(weekStart)}
          onChange={(val) => setWeekStart(Number(val) as WeekDay)}
        />
      </MotiView>

      <View style={styles.buttonContainer}>
        <ActionButton label="Next" onPress={() => onNext(cycleType, weekStart)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  step: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  cards: {
    gap: 12,
    marginBottom: 32,
  },
  cycleCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  cycleEmoji: {
    fontSize: 28,
    marginBottom: 12,
  },
  cycleTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  cycleDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekStartSection: {
    marginBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
});
