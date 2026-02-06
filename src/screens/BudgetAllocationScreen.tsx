import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { MoneyText } from '../components/MoneyText';
import { CategoryIcon } from '../components/CategoryIcon';
import { ActionButton } from '../components/ActionButton';
import { SegmentedControl } from '../components/SegmentedControl';
import type { MoneyCents, Cadence, CategoryKind, RolloverRule } from '../types/domain';
import { cents } from '../types/domain';

interface AllocationRow {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  cadence: Cadence;
  rolloverRule: RolloverRule;
  amountCents: MoneyCents;
}

// TODO: Replace with real data from Zustand store
const MOCK_INCOME_CENTS = cents(500000) as MoneyCents;

const MOCK_ALLOCATIONS: AllocationRow[] = [
  { categoryId: '1', name: 'Rent', icon: 'home', color: '#818CF8', kind: 'need', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(150000) as MoneyCents },
  { categoryId: '2', name: 'Groceries', icon: 'cart', color: '#34D399', kind: 'need', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(60000) as MoneyCents },
  { categoryId: '3', name: 'Transport', icon: 'car', color: '#60A5FA', kind: 'need', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(30000) as MoneyCents },
  { categoryId: '4', name: 'Utilities', icon: 'power', color: '#FBBF24', kind: 'need', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(20000) as MoneyCents },
  { categoryId: '5', name: 'Phone', icon: 'phone', color: '#A78BFA', kind: 'need', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(8000) as MoneyCents },
  { categoryId: '6', name: 'Health', icon: 'health', color: '#F87171', kind: 'need', cadence: 'monthly', rolloverRule: 'pos', amountCents: cents(15000) as MoneyCents },
  { categoryId: '7', name: 'Dining', icon: 'food', color: '#FB923C', kind: 'want', cadence: 'weekly', rolloverRule: 'reset', amountCents: cents(25000) as MoneyCents },
  { categoryId: '8', name: 'Coffee', icon: 'coffee', color: '#A3876A', kind: 'want', cadence: 'weekly', rolloverRule: 'reset', amountCents: cents(5000) as MoneyCents },
  { categoryId: '9', name: 'Entertainment', icon: 'movie', color: '#F472B6', kind: 'want', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(15000) as MoneyCents },
  { categoryId: '10', name: 'Shopping', icon: 'shirt', color: '#38BDF8', kind: 'want', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(20000) as MoneyCents },
  { categoryId: '11', name: 'Subscriptions', icon: 'card', color: '#C084FC', kind: 'want', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(5000) as MoneyCents },
  { categoryId: '12', name: 'Fitness', icon: 'gym', color: '#2DD4BF', kind: 'want', cadence: 'monthly', rolloverRule: 'reset', amountCents: cents(7000) as MoneyCents },
];

const CADENCE_OPTIONS: { label: string; value: Cadence }[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
];

const ROLLOVER_OPTIONS: { label: string; value: RolloverRule }[] = [
  { label: 'Reset', value: 'reset' },
  { label: '+Carry', value: 'pos' },
  { label: '+/-Carry', value: 'pos_neg' },
];

function parseAmountInput(text: string): MoneyCents {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return cents(0) as MoneyCents;
  return cents(Math.round(parsed * 100)) as MoneyCents;
}

function formatDollars(amountCents: MoneyCents): string {
  const value = Math.abs(amountCents as number) / 100;
  return value.toFixed(2);
}

export function BudgetAllocationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [allocations, setAllocations] = useState(MOCK_ALLOCATIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalAllocated = cents(
    allocations.reduce((sum, a) => sum + (a.amountCents as number), 0)
  ) as MoneyCents;
  const unallocated = cents((MOCK_INCOME_CENTS as number) - (totalAllocated as number)) as MoneyCents;
  const isOverAllocated = (unallocated as number) < 0;
  const allocationPercent = Math.min(
    ((totalAllocated as number) / (MOCK_INCOME_CENTS as number)) * 100,
    100
  );

  const updateAmount = useCallback((categoryId: string, text: string) => {
    const newCents = parseAmountInput(text);
    setAllocations((prev) =>
      prev.map((a) => (a.categoryId === categoryId ? { ...a, amountCents: newCents } : a))
    );
  }, []);

  const updateCadence = useCallback((categoryId: string, cadence: Cadence) => {
    setAllocations((prev) =>
      prev.map((a) => (a.categoryId === categoryId ? { ...a, cadence } : a))
    );
  }, []);

  const updateRollover = useCallback((categoryId: string, rolloverRule: RolloverRule) => {
    setAllocations((prev) =>
      prev.map((a) => (a.categoryId === categoryId ? { ...a, rolloverRule } : a))
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Wire to store — upsertBudgets for all allocations
    await new Promise((resolve) => setTimeout(resolve, 300));
    navigation.goBack();
  }, [navigation]);

  const barFillStyle = useAnimatedStyle(() => ({
    width: `${withTiming(allocationPercent, { duration: 300 })}%`,
  }));

  const needs = allocations.filter((a) => a.kind === 'need');
  const wants = allocations.filter((a) => a.kind === 'want');

  const renderRow = (item: AllocationRow, index: number) => {
    const isExpanded = expandedId === item.categoryId;
    return (
      <MotiView
        key={item.categoryId}
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 250, delay: index * 30 }}
      >
        <Pressable
          style={[
            styles.allocationRow,
            { borderBottomColor: theme.colors.borderSubtle },
          ]}
          onPress={() => setExpandedId(isExpanded ? null : item.categoryId)}
        >
          <CategoryIcon icon={item.icon} color={item.color} size={36} />
          <View style={styles.rowInfo}>
            <Text style={[styles.rowName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.rowMeta}>
              <Text style={[styles.rowCadence, { color: theme.colors.textMuted }]}>
                {item.cadence === 'weekly' ? '/wk' : '/mo'}
              </Text>
            </View>
          </View>
          <View style={styles.rowAmountContainer}>
            <View style={styles.rowAmountInputWrapper}>
              <Text style={[styles.dollarSign, { color: theme.colors.textMuted }]}>$</Text>
              <TextInput
                style={[
                  styles.rowAmountInput,
                  {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.fonts.mono,
                  },
                ]}
                value={formatDollars(item.amountCents)}
                onChangeText={(text) => updateAmount(item.categoryId, text)}
                keyboardType="decimal-pad"
                selectionColor={theme.colors.accent}
              />
            </View>
          </View>
        </Pressable>

        {/* Expanded options */}
        {isExpanded && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'timing', duration: 200 }}
            style={[styles.expandedSection, { backgroundColor: theme.colors.bgSurface }]}
          >
            <View style={styles.expandedRow}>
              <Text style={[styles.expandedLabel, { color: theme.colors.textMuted }]}>CADENCE</Text>
              <SegmentedControl
                options={CADENCE_OPTIONS}
                selected={item.cadence}
                onChange={(val) => updateCadence(item.categoryId, val)}
              />
            </View>
            <View style={styles.expandedRow}>
              <Text style={[styles.expandedLabel, { color: theme.colors.textMuted }]}>ROLLOVER</Text>
              <SegmentedControl
                options={ROLLOVER_OPTIONS}
                selected={item.rolloverRule}
                onChange={(val) => updateRollover(item.categoryId, val)}
              />
            </View>
          </MotiView>
        )}
      </MotiView>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bgElevated }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.cancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Budget Allocation</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Allocation progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressMeta}>
          <View style={styles.progressLeft}>
            <MoneyText
              value={totalAllocated}
              size="md"
              color={isOverAllocated ? theme.colors.danger : theme.colors.textPrimary}
              animated={false}
            />
            <Text style={[styles.progressOf, { color: theme.colors.textMuted }]}> of </Text>
            <MoneyText
              value={MOCK_INCOME_CENTS}
              size="md"
              color={theme.colors.textMuted}
              animated={false}
            />
          </View>
          <View style={styles.progressRight}>
            {isOverAllocated ? (
              <Text style={[styles.overLabel, { color: theme.colors.danger }]}>
                OVER BY{' '}
              </Text>
            ) : (
              <Text style={[styles.unallocatedLabel, { color: theme.colors.accent }]}>
                UNALLOCATED{' '}
              </Text>
            )}
            <MoneyText
              value={isOverAllocated ? cents(-(unallocated as number)) as MoneyCents : unallocated}
              size="sm"
              color={isOverAllocated ? theme.colors.danger : theme.colors.accent}
              animated={false}
            />
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.colors.bgSurface }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: isOverAllocated ? theme.colors.danger : theme.colors.accent,
              },
              barFillStyle,
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Needs section */}
        {needs.length > 0 && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
                NEEDS
              </Text>
              <MoneyText
                value={cents(needs.reduce((s, a) => s + (a.amountCents as number), 0)) as MoneyCents}
                size="sm"
                color={theme.colors.textSecondary}
                animated={false}
              />
            </View>
            {needs.map((item, i) => renderRow(item, i))}
          </View>
        )}

        {/* Wants section */}
        {wants.length > 0 && (
          <View style={styles.wantsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
                WANTS
              </Text>
              <MoneyText
                value={cents(wants.reduce((s, a) => s + (a.amountCents as number), 0)) as MoneyCents}
                size="sm"
                color={theme.colors.textSecondary}
                animated={false}
              />
            </View>
            {wants.map((item, i) => renderRow(item, needs.length + i))}
          </View>
        )}

        {/* Save button */}
        <View style={styles.buttonSection}>
          <ActionButton
            label="Save Allocations"
            onPress={handleSave}
            loading={saving}
          />
          {isOverAllocated && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300 }}
            >
              <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                Budget is over-allocated. You can still save, but spending will exceed income.
              </Text>
            </MotiView>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cancel: {
    fontSize: 15,
    minWidth: 50,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    minWidth: 50,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressOf: {
    fontSize: 14,
  },
  progressRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  overLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  unallocatedLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scroll: {
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
  },
  wantsSection: {
    marginTop: 8,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowCadence: {
    fontSize: 11,
  },
  rowAmountContainer: {
    alignItems: 'flex-end',
  },
  rowAmountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dollarSign: {
    fontSize: 14,
    fontWeight: '400',
    marginRight: 1,
  },
  rowAmountInput: {
    fontSize: 17,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
    padding: 0,
  },
  expandedSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  expandedRow: {
    gap: 6,
  },
  expandedLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
  },
  buttonSection: {
    paddingHorizontal: 20,
    marginTop: 32,
    gap: 12,
  },
  warningText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
