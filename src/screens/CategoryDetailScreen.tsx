import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';
import { MoneyText } from '../components/MoneyText';
import { ProgressRing } from '../components/ProgressRing';
import { ProgressBar } from '../components/ProgressBar';
import { StatusDot } from '../components/StatusDot';
import { PanelCard } from '../components/PanelCard';
import { PanelHeader } from '../components/PanelHeader';
import { CategoryIcon } from '../components/CategoryIcon';
import type { MoneyCents, PaceStatus } from '../types/domain';
import { cents } from '../types/domain';

// TODO: Replace with real data from Zustand store + route params
const MOCK_DETAIL = {
  category: {
    name: 'Groceries',
    icon: 'cart',
    color: '#34D399',
  },
  budgetedCents: cents(60000) as MoneyCents,
  spentCents: cents(31200) as MoneyCents,
  remainingCents: cents(28800) as MoneyCents,
  leftTodayCents: cents(4800) as MoneyCents,
  leftThisWeekCents: cents(14400) as MoneyCents,
  paceStatus: 'on_track' as PaceStatus,
  recentTransactions: [
    { id: '1', merchant: 'Trader Joe\'s', date: 'Feb 5', amountCents: cents(-4250) as MoneyCents },
    { id: '2', merchant: 'Whole Foods', date: 'Feb 3', amountCents: cents(-8730) as MoneyCents },
    { id: '3', merchant: 'Costco', date: 'Feb 1', amountCents: cents(-18220) as MoneyCents },
  ],
};

const statusLabel: Record<PaceStatus, string> = {
  on_track: 'On track',
  warning: 'Watch spending',
  overspent: 'Overspent',
};

export function CategoryDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const data = MOCK_DETAIL;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back + category header */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.colors.accent }]}>Back</Text>
          </Pressable>

          <View style={styles.categoryHeader}>
            <CategoryIcon icon={data.category.icon} color={data.category.color} size={48} />
            <View style={styles.categoryMeta}>
              <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]}>
                {data.category.name}
              </Text>
              <View style={styles.statusRow}>
                <StatusDot status={data.paceStatus} />
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                  {statusLabel[data.paceStatus]}
                </Text>
              </View>
            </View>
          </View>
        </MotiView>

        {/* Budget ring + metrics */}
        <PanelCard delay={50}>
          <View style={styles.metricsPanel}>
            <ProgressRing
              spent={data.spentCents}
              budget={data.budgetedCents}
              size={100}
              strokeWidth={8}
              color={data.category.color}
            >
              <Text style={[styles.ringPercent, { color: theme.colors.textPrimary, fontFamily: theme.fonts.mono }]}>
                {Math.round(((data.spentCents as number) / (data.budgetedCents as number)) * 100)}%
              </Text>
            </ProgressRing>

            <View style={styles.metricsGrid}>
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>BUDGET</Text>
                <MoneyText value={data.budgetedCents} size="md" animated={false} />
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>SPENT</Text>
                <MoneyText value={data.spentCents} size="md" animated={false} />
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>LEFT</Text>
                <MoneyText value={data.remainingCents} size="md" color={theme.colors.accent} animated={false} />
              </View>
            </View>
          </View>
        </PanelCard>

        {/* Left to spend cards */}
        <View style={styles.leftToSpendRow}>
          <PanelCard delay={100} style={styles.leftCard}>
            <View style={styles.leftCardInner}>
              <Text style={[styles.leftLabel, { color: theme.colors.textMuted }]}>LEFT TODAY</Text>
              <MoneyText value={data.leftTodayCents} size="lg" color={theme.colors.accent} />
            </View>
          </PanelCard>

          <PanelCard delay={150} style={styles.leftCard}>
            <View style={styles.leftCardInner}>
              <Text style={[styles.leftLabel, { color: theme.colors.textMuted }]}>LEFT THIS WEEK</Text>
              <MoneyText value={data.leftThisWeekCents} size="lg" color={theme.colors.textPrimary} />
            </View>
          </PanelCard>
        </View>

        {/* Period progress bar */}
        <PanelCard delay={200}>
          <View style={styles.progressPanel}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.colors.textMuted }]}>PERIOD USAGE</Text>
            </View>
            <ProgressBar
              spent={data.spentCents}
              budget={data.budgetedCents}
              height={8}
              color={data.category.color}
            />
          </View>
        </PanelCard>

        {/* Burn-down chart placeholder */}
        <PanelCard delay={250}>
          <PanelHeader label="Burn-down" />
          <View style={styles.chartPlaceholder}>
            <Text style={[styles.chartText, { color: theme.colors.textMuted }]}>
              Burn-down chart will render here
            </Text>
          </View>
        </PanelCard>

        {/* Recent transactions */}
        <PanelCard delay={300}>
          <PanelHeader
            label="Recent Transactions"
            right={
              <Text style={[styles.seeAll, { color: theme.colors.accent }]}>See all</Text>
            }
          />
          {data.recentTransactions.map((tx, i) => (
            <MotiView
              key={tx.id}
              from={{ opacity: 0, translateX: -8 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 250, delay: 350 + i * 50 }}
            >
              <View
                style={[
                  styles.txRow,
                  i < data.recentTransactions.length - 1 && {
                    borderBottomWidth: 0.5,
                    borderBottomColor: theme.colors.borderSubtle,
                  },
                ]}
              >
                <View style={styles.txInfo}>
                  <Text style={[styles.txMerchant, { color: theme.colors.textPrimary }]}>{tx.merchant}</Text>
                  <Text style={[styles.txDate, { color: theme.colors.textMuted }]}>{tx.date}</Text>
                </View>
                <MoneyText value={tx.amountCents} size="sm" animated={false} />
              </View>
            </MotiView>
          ))}
        </PanelCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  backButton: {
    paddingVertical: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  categoryMeta: {
    gap: 4,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 13,
  },
  metricsPanel: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ringPercent: {
    fontSize: 17,
    fontWeight: '700',
  },
  metricsGrid: {
    flex: 1,
    gap: 12,
  },
  metric: {
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  leftToSpendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  leftCard: {
    flex: 1,
  },
  leftCardInner: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  leftLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  progressPanel: {
    padding: 16,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  chartPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartText: {
    fontSize: 13,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  txInfo: {
    gap: 2,
  },
  txMerchant: {
    fontSize: 15,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 12,
  },
});
