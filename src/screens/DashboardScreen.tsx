import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';
import { MoneyText } from '../components/MoneyText';
import { ProgressBar } from '../components/ProgressBar';
import { StatusDot } from '../components/StatusDot';
import { PanelCard } from '../components/PanelCard';
import { PanelHeader } from '../components/PanelHeader';
import { FAB } from '../components/FAB';
import { CategoryIcon } from '../components/CategoryIcon';
import type { RootStackParamList } from '../app/AppNavigator';
import type { MoneyCents, PaceStatus } from '../types/domain';
import { cents } from '../types/domain';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// TODO: Replace with real data from Zustand store once backend is wired
const MOCK_DASHBOARD = {
  periodLabel: 'FEBRUARY 2026',
  totalRemaining: cents(245000) as MoneyCents,
  totalBudgeted: cents(500000) as MoneyCents,
  safeTodayCents: cents(8200) as MoneyCents,
  totalSpent: cents(255000) as MoneyCents,
  highlights: [
    {
      categoryId: '1',
      name: 'Groceries',
      icon: 'cart',
      color: '#34D399',
      leftThisWeek: cents(4800) as MoneyCents,
      budgeted: cents(60000) as MoneyCents,
      spent: cents(31200) as MoneyCents,
      status: 'on_track' as PaceStatus,
    },
    {
      categoryId: '2',
      name: 'Dining',
      icon: 'food',
      color: '#FB923C',
      leftThisWeek: cents(2100) as MoneyCents,
      budgeted: cents(25000) as MoneyCents,
      spent: cents(18900) as MoneyCents,
      status: 'warning' as PaceStatus,
    },
    {
      categoryId: '3',
      name: 'Transport',
      icon: 'car',
      color: '#60A5FA',
      leftThisWeek: cents(6500) as MoneyCents,
      budgeted: cents(30000) as MoneyCents,
      spent: cents(8500) as MoneyCents,
      status: 'on_track' as PaceStatus,
    },
    {
      categoryId: '4',
      name: 'Entertainment',
      icon: 'movie',
      color: '#F472B6',
      leftThisWeek: cents(0) as MoneyCents,
      budgeted: cents(15000) as MoneyCents,
      spent: cents(17200) as MoneyCents,
      status: 'overspent' as PaceStatus,
    },
  ],
};

export function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const data = MOCK_DASHBOARD;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Header */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.header}
        >
          <Text style={[styles.periodLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
            {data.periodLabel}
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Dashboard</Text>
        </MotiView>

        {/* Top Tiles */}
        <View style={styles.tilesRow}>
          <PanelCard delay={50} style={styles.tile}>
            <View style={styles.tileInner}>
              <Text style={[styles.tileLabel, { color: theme.colors.textMuted }]}>REMAINING</Text>
              <MoneyText value={data.totalRemaining} size="lg" color={theme.colors.accent} showCents={false} />
              <View style={styles.tileMeta}>
                <Text style={[styles.tileMetaText, { color: theme.colors.textMuted }]}>
                  of{' '}
                </Text>
                <MoneyText value={data.totalBudgeted} size="sm" color={theme.colors.textMuted} showCents={false} />
              </View>
            </View>
          </PanelCard>

          <PanelCard delay={100} style={styles.tile}>
            <View style={styles.tileInner}>
              <Text style={[styles.tileLabel, { color: theme.colors.textMuted }]}>SAFE TODAY</Text>
              <MoneyText value={data.safeTodayCents} size="lg" color={theme.colors.textPrimary} />
              <Text style={[styles.tileHint, { color: theme.colors.textMuted }]}>across all categories</Text>
            </View>
          </PanelCard>
        </View>

        {/* Overall progress */}
        <PanelCard delay={150}>
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.colors.textMuted }]}>PERIOD PROGRESS</Text>
              <Text style={[styles.progressPercent, { color: theme.colors.textSecondary, fontFamily: theme.fonts.mono }]}>
                {Math.round(((data.totalSpent as number) / (data.totalBudgeted as number)) * 100)}%
              </Text>
            </View>
            <ProgressBar spent={data.totalSpent} budget={data.totalBudgeted} height={8} />
          </View>
        </PanelCard>

        {/* Category Highlights */}
        <PanelCard delay={200}>
          <PanelHeader label="Category Highlights" />
          <View style={styles.highlightsList}>
            {data.highlights.map((cat, i) => (
              <MotiView
                key={cat.categoryId}
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 250 + i * 60 }}
              >
                <Pressable
                  style={[
                    styles.highlightRow,
                    i < data.highlights.length - 1 && {
                      borderBottomWidth: 0.5,
                      borderBottomColor: theme.colors.borderSubtle,
                    },
                  ]}
                  onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.categoryId })}
                >
                  <CategoryIcon icon={cat.icon} color={cat.color} size={36} />
                  <View style={styles.highlightInfo}>
                    <View style={styles.highlightNameRow}>
                      <Text style={[styles.highlightName, { color: theme.colors.textPrimary }]}>
                        {cat.name}
                      </Text>
                      <StatusDot status={cat.status} />
                    </View>
                    <ProgressBar
                      spent={cat.spent}
                      budget={cat.budgeted}
                      height={4}
                      color={cat.color}
                    />
                    <View style={styles.highlightMeta}>
                      <MoneyText
                        value={cat.leftThisWeek}
                        size="sm"
                        color={cat.status === 'overspent' ? theme.colors.danger : theme.colors.textSecondary}
                        animated={false}
                      />
                      <Text style={[styles.highlightMetaLabel, { color: theme.colors.textMuted }]}>
                        {cat.status === 'overspent' ? ' overspent' : ' left this wk'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </MotiView>
            ))}
          </View>
        </PanelCard>

        {/* Chart placeholder */}
        <PanelCard delay={300}>
          <PanelHeader label="Spending Trend" />
          <View style={styles.chartPlaceholder}>
            <Text style={[styles.chartPlaceholderText, { color: theme.colors.textMuted }]}>
              Charts will render here
            </Text>
          </View>
        </PanelCard>
      </ScrollView>

      <FAB onPress={() => navigation.navigate('AddTransaction')} />
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
    paddingBottom: 16,
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
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    flex: 1,
  },
  tileInner: {
    padding: 16,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  tileMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  tileMetaText: {
    fontSize: 13,
  },
  tileHint: {
    fontSize: 12,
    marginTop: 4,
  },
  progressSection: {
    padding: 16,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  highlightsList: {
    paddingHorizontal: 0,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  highlightInfo: {
    flex: 1,
    gap: 6,
  },
  highlightNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightName: {
    fontSize: 15,
    fontWeight: '500',
  },
  highlightMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  highlightMetaLabel: {
    fontSize: 12,
  },
  chartPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 13,
  },
});
