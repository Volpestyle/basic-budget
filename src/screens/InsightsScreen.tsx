import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';
import { MoneyText } from '../components/MoneyText';
import { PanelCard } from '../components/PanelCard';
import { PanelHeader } from '../components/PanelHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { ProgressBar } from '../components/ProgressBar';
import { CategoryIcon } from '../components/CategoryIcon';
import type { MoneyCents } from '../types/domain';
import { cents } from '../types/domain';

type TimeRange = 'week' | 'month' | 'quarter';

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
];

// TODO: Replace with real data from Zustand store
const MOCK_INSIGHTS = {
  periodLabel: 'FEBRUARY 2026',
  totalSpent: cents(255000) as MoneyCents,
  totalBudgeted: cents(500000) as MoneyCents,
  dailyAverage: cents(8500) as MoneyCents,
  daysLeft: 23,
  weekOverWeek: -12, // percent change
  topCategories: [
    { name: 'Rent', icon: 'home', color: '#818CF8', spentCents: cents(150000) as MoneyCents, budgetCents: cents(150000) as MoneyCents, percentOfTotal: 59 },
    { name: 'Groceries', icon: 'cart', color: '#34D399', spentCents: cents(31200) as MoneyCents, budgetCents: cents(60000) as MoneyCents, percentOfTotal: 12 },
    { name: 'Dining', icon: 'food', color: '#FB923C', spentCents: cents(18900) as MoneyCents, budgetCents: cents(25000) as MoneyCents, percentOfTotal: 7 },
    { name: 'Entertainment', icon: 'movie', color: '#F472B6', spentCents: cents(17200) as MoneyCents, budgetCents: cents(15000) as MoneyCents, percentOfTotal: 7 },
    { name: 'Transport', icon: 'car', color: '#60A5FA', spentCents: cents(8500) as MoneyCents, budgetCents: cents(30000) as MoneyCents, percentOfTotal: 3 },
  ],
  weeklySpending: [
    { label: 'W1', amountCents: cents(82000) as MoneyCents },
    { label: 'W2', amountCents: cents(67000) as MoneyCents },
    { label: 'W3', amountCents: cents(58500) as MoneyCents },
    { label: 'W4', amountCents: cents(47500) as MoneyCents },
  ],
};

export function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const data = MOCK_INSIGHTS;

  const maxWeekly = Math.max(
    ...data.weeklySpending.map((w) => w.amountCents as number)
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.header}
        >
          <Text style={[styles.periodLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
            {data.periodLabel}
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Insights</Text>
        </MotiView>

        {/* Time range selector */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 50 }}
          style={styles.segmentWrapper}
        >
          <SegmentedControl
            options={TIME_RANGE_OPTIONS}
            selected={timeRange}
            onChange={setTimeRange}
          />
        </MotiView>

        {/* Summary metrics */}
        <View style={styles.metricsRow}>
          <PanelCard delay={100} style={styles.metricTile}>
            <View style={styles.metricInner}>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>TOTAL SPENT</Text>
              <MoneyText value={data.totalSpent} size="lg" color={theme.colors.textPrimary} showCents={false} />
              <Text style={[styles.metricSub, { color: theme.colors.textMuted }]}>
                of{' '}
                <Text style={{ fontFamily: theme.fonts.mono }}>
                  ${((data.totalBudgeted as number) / 100).toLocaleString()}
                </Text>
              </Text>
            </View>
          </PanelCard>

          <PanelCard delay={150} style={styles.metricTile}>
            <View style={styles.metricInner}>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>DAILY AVG</Text>
              <MoneyText value={data.dailyAverage} size="lg" color={theme.colors.accent} />
              <Text style={[styles.metricSub, { color: theme.colors.textMuted }]}>
                {data.daysLeft} days left
              </Text>
            </View>
          </PanelCard>
        </View>

        {/* Week-over-week change */}
        <PanelCard delay={200}>
          <View style={styles.wowPanel}>
            <Text style={[styles.wowLabel, { color: theme.colors.textMuted }]}>WEEK OVER WEEK</Text>
            <View style={styles.wowValue}>
              <Text
                style={[
                  styles.wowPercent,
                  {
                    color: data.weekOverWeek < 0 ? theme.colors.accent : theme.colors.danger,
                    fontFamily: theme.fonts.mono,
                  },
                ]}
              >
                {data.weekOverWeek < 0 ? '\u2193' : '\u2191'} {Math.abs(data.weekOverWeek)}%
              </Text>
              <Text style={[styles.wowContext, { color: theme.colors.textSecondary }]}>
                {data.weekOverWeek < 0 ? 'less than last week' : 'more than last week'}
              </Text>
            </View>
          </View>
        </PanelCard>

        {/* Spending trend chart placeholder */}
        <PanelCard delay={250}>
          <PanelHeader label="Spending Trend" />
          <View style={styles.chartPlaceholder}>
            <View style={styles.chartLines}>
              {[0.2, 0.5, 0.8, 1.0].map((pct) => (
                <View
                  key={pct}
                  style={[styles.chartLine, { backgroundColor: theme.colors.borderSubtle, top: `${(1 - pct) * 100}%` }]}
                />
              ))}
            </View>
            <Text style={[styles.chartText, { color: theme.colors.textMuted }]}>
              Victory Native chart will render here
            </Text>
          </View>
        </PanelCard>

        {/* Weekly bar chart */}
        <PanelCard delay={300}>
          <PanelHeader label="Weekly Spending" />
          <View style={styles.barChart}>
            {data.weeklySpending.map((week, i) => {
              const heightPct = maxWeekly > 0 ? ((week.amountCents as number) / maxWeekly) * 100 : 0;
              return (
                <MotiView
                  key={week.label}
                  from={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ type: 'timing', duration: 400, delay: 350 + i * 80 }}
                  style={styles.barColumn}
                >
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: theme.colors.accent,
                          opacity: i === data.weeklySpending.length - 1 ? 1 : 0.5,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
                    {week.label}
                  </Text>
                  <Text style={[styles.barAmount, { color: theme.colors.textSecondary, fontFamily: theme.fonts.mono }]}>
                    ${Math.round((week.amountCents as number) / 100)}
                  </Text>
                </MotiView>
              );
            })}
          </View>
        </PanelCard>

        {/* Category breakdown placeholder (donut) */}
        <PanelCard delay={350}>
          <PanelHeader label="Category Breakdown" />
          <View style={styles.donutPlaceholder}>
            <View style={[styles.donutRing, { borderColor: theme.colors.borderDefault }]}>
              <Text style={[styles.donutCenter, { color: theme.colors.textPrimary, fontFamily: theme.fonts.mono }]}>
                {Math.round(((data.totalSpent as number) / (data.totalBudgeted as number)) * 100)}%
              </Text>
              <Text style={[styles.donutLabel, { color: theme.colors.textMuted }]}>spent</Text>
            </View>
          </View>
        </PanelCard>

        {/* Top categories */}
        <PanelCard delay={400}>
          <PanelHeader label="Top Categories" right={
            <Text style={[styles.topCount, { color: theme.colors.textMuted }]}>
              {data.topCategories.length}
            </Text>
          } />
          {data.topCategories.map((cat, i) => (
            <MotiView
              key={cat.name}
              from={{ opacity: 0, translateX: -8 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 250, delay: 450 + i * 50 }}
            >
              <View
                style={[
                  styles.topRow,
                  i < data.topCategories.length - 1 && {
                    borderBottomWidth: 0.5,
                    borderBottomColor: theme.colors.borderSubtle,
                  },
                ]}
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size={36} />
                <View style={styles.topInfo}>
                  <View style={styles.topNameRow}>
                    <Text style={[styles.topName, { color: theme.colors.textPrimary }]}>{cat.name}</Text>
                    <Text style={[styles.topPercent, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
                      {cat.percentOfTotal}%
                    </Text>
                  </View>
                  <ProgressBar
                    spent={cat.spentCents}
                    budget={cat.budgetCents}
                    height={3}
                    color={cat.color}
                  />
                  <View style={styles.topAmounts}>
                    <MoneyText value={cat.spentCents} size="sm" color={theme.colors.textSecondary} animated={false} />
                    <Text style={[styles.topOfBudget, { color: theme.colors.textMuted }]}>
                      {' '}of{' '}
                    </Text>
                    <MoneyText value={cat.budgetCents} size="sm" color={theme.colors.textMuted} animated={false} />
                  </View>
                </View>
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
  header: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  periodLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  segmentWrapper: {
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricTile: {
    flex: 1,
  },
  metricInner: {
    padding: 16,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  metricSub: {
    fontSize: 12,
    marginTop: 4,
  },
  wowPanel: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wowLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  wowValue: {
    alignItems: 'flex-end',
    gap: 2,
  },
  wowPercent: {
    fontSize: 20,
    fontWeight: '700',
  },
  wowContext: {
    fontSize: 12,
  },
  chartPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chartLines: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
  },
  chartLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.5,
  },
  chartText: {
    fontSize: 13,
  },
  barChart: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    alignItems: 'flex-end',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
  },
  barAmount: {
    fontSize: 10,
  },
  donutPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    fontSize: 24,
    fontWeight: '700',
  },
  donutLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  topCount: {
    fontSize: 13,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  topInfo: {
    flex: 1,
    gap: 5,
  },
  topNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topName: {
    fontSize: 15,
    fontWeight: '500',
  },
  topPercent: {
    fontSize: 13,
  },
  topAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  topOfBudget: {
    fontSize: 12,
  },
});
