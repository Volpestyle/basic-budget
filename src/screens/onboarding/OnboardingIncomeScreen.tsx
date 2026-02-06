import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTheme } from '../../theme/ThemeProvider';
import { AmountInput } from '../../components/AmountInput';
import { ActionButton } from '../../components/ActionButton';
import type { MoneyCents, CycleType } from '../../types/domain';
import { cents } from '../../types/domain';

interface StarterCategory {
  name: string;
  icon: string;
  color: string;
  kind: 'need' | 'want';
}

const STARTER_CATEGORIES: StarterCategory[] = [
  { name: 'Rent', icon: 'home', color: '#818CF8', kind: 'need' },
  { name: 'Groceries', icon: 'cart', color: '#34D399', kind: 'need' },
  { name: 'Transport', icon: 'car', color: '#60A5FA', kind: 'need' },
  { name: 'Utilities', icon: 'power', color: '#FBBF24', kind: 'need' },
  { name: 'Health', icon: 'health', color: '#F87171', kind: 'need' },
  { name: 'Phone', icon: 'phone', color: '#A78BFA', kind: 'need' },
  { name: 'Dining', icon: 'food', color: '#FB923C', kind: 'want' },
  { name: 'Coffee', icon: 'coffee', color: '#A3876A', kind: 'want' },
  { name: 'Entertainment', icon: 'movie', color: '#F472B6', kind: 'want' },
  { name: 'Shopping', icon: 'shirt', color: '#38BDF8', kind: 'want' },
  { name: 'Subscriptions', icon: 'music', color: '#C084FC', kind: 'want' },
  { name: 'Fitness', icon: 'gym', color: '#4ADE80', kind: 'want' },
];

const iconMap: Record<string, string> = {
  home: '\u{1F3E0}',
  cart: '\u{1F6D2}',
  car: '\u{1F697}',
  power: '\u{26A1}',
  health: '\u{2764}',
  phone: '\u{1F4F1}',
  food: '\u{1F37D}',
  coffee: '\u{2615}',
  movie: '\u{1F3AC}',
  shirt: '\u{1F455}',
  music: '\u{1F3B5}',
  gym: '\u{1F4AA}',
};

interface OnboardingIncomeScreenProps {
  cycleType: CycleType;
  onComplete: (incomeCents: MoneyCents, categories: StarterCategory[]) => void;
  onBack: () => void;
}

export function OnboardingIncomeScreen({ cycleType, onComplete, onBack }: OnboardingIncomeScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [incomeCents, setIncomeCents] = useState<MoneyCents>(cents(0));
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(STARTER_CATEGORIES.filter((c) => c.kind === 'need').map((c) => c.name)),
  );

  const toggleCategory = useCallback((name: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleComplete = () => {
    const chosen = STARTER_CATEGORIES.filter((c) => selectedCategories.has(c.name));
    onComplete(incomeCents, chosen);
  };

  const handleIncomeChange = useCallback((value: MoneyCents) => {
    // Income is positive, so negate what AmountInput gives (which defaults negative)
    setIncomeCents(Math.abs(value as number) as MoneyCents);
  }, []);

  const periodLabel = cycleType === 'monthly' ? 'per month' : 'per pay period';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <Pressable onPress={onBack}>
        <Text style={[styles.back, { color: theme.colors.accent }]}>Back</Text>
      </Pressable>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
      >
        <Text style={[styles.step, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
          STEP 2 OF 2
        </Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Set your income
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          How much do you earn {periodLabel}?
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 100 }}
        style={styles.incomeContainer}
      >
        <AmountInput
          value={incomeCents}
          onChange={handleIncomeChange}
          autoFocus
          isNegative={false}
        />
        <Text style={[styles.periodHint, { color: theme.colors.textMuted }]}>{periodLabel}</Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
      >
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          STARTER CATEGORIES
        </Text>
        <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
          Tap to toggle. You can customize these later.
        </Text>

        <Text style={[styles.groupLabel, { color: theme.colors.textMuted }]}>NEEDS</Text>
        <View style={styles.categoryGrid}>
          {STARTER_CATEGORIES.filter((c) => c.kind === 'need').map((cat, i) => {
            const isSelected = selectedCategories.has(cat.name);
            return (
              <MotiView
                key={cat.name}
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 120, delay: 250 + i * 40 }}
              >
                <Pressable onPress={() => toggleCategory(cat.name)}>
                  <MotiView
                    animate={{
                      scale: isSelected ? 1 : 0.92,
                      opacity: isSelected ? 1 : 0.45,
                    }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? `${cat.color}20` : theme.colors.bgSurface,
                        borderColor: isSelected ? cat.color : theme.colors.borderDefault,
                      },
                    ]}
                  >
                    <Text style={styles.chipEmoji}>{iconMap[cat.icon] ?? cat.icon}</Text>
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: isSelected ? theme.colors.textPrimary : theme.colors.textMuted },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </MotiView>
                </Pressable>
              </MotiView>
            );
          })}
        </View>

        <Text style={[styles.groupLabel, { color: theme.colors.textMuted }]}>WANTS</Text>
        <View style={styles.categoryGrid}>
          {STARTER_CATEGORIES.filter((c) => c.kind === 'want').map((cat, i) => {
            const isSelected = selectedCategories.has(cat.name);
            return (
              <MotiView
                key={cat.name}
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 120, delay: 350 + i * 40 }}
              >
                <Pressable onPress={() => toggleCategory(cat.name)}>
                  <MotiView
                    animate={{
                      scale: isSelected ? 1 : 0.92,
                      opacity: isSelected ? 1 : 0.45,
                    }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? `${cat.color}20` : theme.colors.bgSurface,
                        borderColor: isSelected ? cat.color : theme.colors.borderDefault,
                      },
                    ]}
                  >
                    <Text style={styles.chipEmoji}>{iconMap[cat.icon] ?? cat.icon}</Text>
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: isSelected ? theme.colors.textPrimary : theme.colors.textMuted },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </MotiView>
                </Pressable>
              </MotiView>
            );
          })}
        </View>
      </MotiView>

      <View style={styles.buttonContainer}>
        <ActionButton
          label="Start budgeting"
          onPress={handleComplete}
          disabled={(incomeCents as number) === 0}
        />
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
  back: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
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
    marginBottom: 24,
  },
  incomeContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 32,
  },
  periodHint: {
    fontSize: 13,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: 20,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 32,
  },
});
