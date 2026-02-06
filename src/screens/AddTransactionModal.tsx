import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../theme/ThemeProvider';
import { AmountInput } from '../components/AmountInput';
import { CategoryPill } from '../components/CategoryPill';
import { ActionButton } from '../components/ActionButton';
import { useAppStore } from '../state/store';
import type { DateString, MoneyCents } from '../types/domain';
import { cents } from '../types/domain';

const toDateString = (date: Date): DateString => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as DateString;
};

export function AddTransactionModal() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const categories = useAppStore((state) => state.categories);
  const loadCategories = useAppStore((state) => state.loadCategories);
  const addTransaction = useAppStore((state) => state.addTransaction);
  const selectedPeriodId = useAppStore((state) => state.selectedPeriodId);
  const currentPeriod = useAppStore((state) => state.currentPeriod);

  const [amountCents, setAmountCents] = useState<MoneyCents>(cents(0));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      void loadCategories();
    }
  }, [categories.length, loadCategories]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const todayDate = toDateString(today);

  const periodId = selectedPeriodId ?? currentPeriod?.id ?? null;
  const canSave = (amountCents as number) !== 0 && selectedCategoryId !== null && periodId !== null;

  const handleSave = useCallback(async () => {
    if (!canSave || !selectedCategoryId || !periodId) {
      return;
    }

    setSaving(true);

    try {
      const normalizedAmount = cents(-Math.abs(amountCents as number)) as MoneyCents;
      await addTransaction({
        date: todayDate,
        amountCents: normalizedAmount,
        categoryId: selectedCategoryId,
        periodId,
        merchant: merchant.trim() || undefined,
        note: note.trim() || undefined,
        source: 'manual',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }, [addTransaction, amountCents, canSave, merchant, navigation, note, periodId, selectedCategoryId, todayDate]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bgElevated }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.cancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Add Transaction</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 120 }}
          style={styles.amountSection}
        >
          <AmountInput value={amountCents} onChange={setAmountCents} autoFocus />
          <Text style={[styles.dateLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}> 
            {dateLabel}
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 100 }}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                name={cat.name}
                color={cat.color}
                selected={selectedCategoryId === cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
              />
            ))}
          </ScrollView>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 150 }}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>MERCHANT</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderDefault,
                backgroundColor: theme.colors.bgSurface,
              },
            ]}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g. Trader Joe's"
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.accent}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>NOTE</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderDefault,
                backgroundColor: theme.colors.bgSurface,
              },
            ]}
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.accent}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 250 }}
          style={styles.buttonSection}
        >
          <ActionButton
            label="Save"
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
          />
        </MotiView>
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  dateLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  textInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  buttonSection: {
    marginTop: 32,
  },
});
