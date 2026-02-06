import React, { useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { MoneyText } from '../components/MoneyText';
import { ProgressBar } from '../components/ProgressBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { StatusDot } from '../components/StatusDot';
import { PanelCard } from '../components/PanelCard';
import { SwipeRow } from '../components/SwipeRow';
import { EmptyState } from '../components/EmptyState';
import type { RootStackParamList } from '../app/AppNavigator';
import type { MoneyCents, CategoryKind, PaceStatus } from '../types/domain';
import { cents } from '../types/domain';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface CategoryRow {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  budgetedCents: MoneyCents;
  spentCents: MoneyCents;
  remainingCents: MoneyCents;
  paceStatus: PaceStatus;
}

interface KindSection {
  kind: CategoryKind;
  title: string;
  totalBudgeted: MoneyCents;
  totalSpent: MoneyCents;
  data: CategoryRow[];
}

// TODO: Replace with real data from Zustand store
const MOCK_CATEGORIES: CategoryRow[] = [
  { id: '1', name: 'Rent', kind: 'need', icon: 'home', color: '#818CF8', budgetedCents: cents(150000) as MoneyCents, spentCents: cents(150000) as MoneyCents, remainingCents: cents(0) as MoneyCents, paceStatus: 'on_track' },
  { id: '2', name: 'Groceries', kind: 'need', icon: 'cart', color: '#34D399', budgetedCents: cents(60000) as MoneyCents, spentCents: cents(31200) as MoneyCents, remainingCents: cents(28800) as MoneyCents, paceStatus: 'on_track' },
  { id: '3', name: 'Transport', kind: 'need', icon: 'car', color: '#60A5FA', budgetedCents: cents(30000) as MoneyCents, spentCents: cents(8500) as MoneyCents, remainingCents: cents(21500) as MoneyCents, paceStatus: 'on_track' },
  { id: '4', name: 'Utilities', kind: 'need', icon: 'power', color: '#FBBF24', budgetedCents: cents(20000) as MoneyCents, spentCents: cents(18700) as MoneyCents, remainingCents: cents(1300) as MoneyCents, paceStatus: 'warning' },
  { id: '5', name: 'Phone', kind: 'need', icon: 'phone', color: '#A78BFA', budgetedCents: cents(8000) as MoneyCents, spentCents: cents(8000) as MoneyCents, remainingCents: cents(0) as MoneyCents, paceStatus: 'on_track' },
  { id: '6', name: 'Health', kind: 'need', icon: 'health', color: '#F87171', budgetedCents: cents(15000) as MoneyCents, spentCents: cents(4500) as MoneyCents, remainingCents: cents(10500) as MoneyCents, paceStatus: 'on_track' },
  { id: '7', name: 'Dining', kind: 'want', icon: 'food', color: '#FB923C', budgetedCents: cents(25000) as MoneyCents, spentCents: cents(18900) as MoneyCents, remainingCents: cents(6100) as MoneyCents, paceStatus: 'warning' },
  { id: '8', name: 'Coffee', kind: 'want', icon: 'coffee', color: '#A3876A', budgetedCents: cents(5000) as MoneyCents, spentCents: cents(3200) as MoneyCents, remainingCents: cents(1800) as MoneyCents, paceStatus: 'on_track' },
  { id: '9', name: 'Entertainment', kind: 'want', icon: 'movie', color: '#F472B6', budgetedCents: cents(15000) as MoneyCents, spentCents: cents(17200) as MoneyCents, remainingCents: cents(-2200) as MoneyCents, paceStatus: 'overspent' },
  { id: '10', name: 'Shopping', kind: 'want', icon: 'shirt', color: '#38BDF8', budgetedCents: cents(20000) as MoneyCents, spentCents: cents(8400) as MoneyCents, remainingCents: cents(11600) as MoneyCents, paceStatus: 'on_track' },
  { id: '11', name: 'Subscriptions', kind: 'want', icon: 'card', color: '#C084FC', budgetedCents: cents(5000) as MoneyCents, spentCents: cents(4800) as MoneyCents, remainingCents: cents(200) as MoneyCents, paceStatus: 'warning' },
  { id: '12', name: 'Fitness', kind: 'want', icon: 'gym', color: '#2DD4BF', budgetedCents: cents(7000) as MoneyCents, spentCents: cents(5000) as MoneyCents, remainingCents: cents(2000) as MoneyCents, paceStatus: 'on_track' },
];

function buildSections(categories: CategoryRow[]): KindSection[] {
  const needs = categories.filter((c) => c.kind === 'need');
  const wants = categories.filter((c) => c.kind === 'want');

  const sumBudget = (cats: CategoryRow[]): MoneyCents =>
    cents(cats.reduce((sum, c) => sum + (c.budgetedCents as number), 0)) as MoneyCents;
  const sumSpent = (cats: CategoryRow[]): MoneyCents =>
    cents(cats.reduce((sum, c) => sum + (c.spentCents as number), 0)) as MoneyCents;

  const sections: KindSection[] = [];
  if (needs.length > 0) {
    sections.push({
      kind: 'need',
      title: 'NEEDS',
      totalBudgeted: sumBudget(needs),
      totalSpent: sumSpent(needs),
      data: needs,
    });
  }
  if (wants.length > 0) {
    sections.push({
      kind: 'want',
      title: 'WANTS',
      totalBudgeted: sumBudget(wants),
      totalSpent: sumSpent(wants),
      data: wants,
    });
  }
  return sections;
}

export function CategoriesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const sections = buildSections(MOCK_CATEGORIES);
  const hasCategories = MOCK_CATEGORIES.length > 0;

  const handleArchive = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // TODO: Wire to store — archiveCategory(id)
    void id;
  }, []);

  const renderItem = ({ item, index }: { item: CategoryRow; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250, delay: index * 40 }}
    >
      <SwipeRow
        rightAction={{
          label: 'Archive',
          color: theme.colors.warning,
          onPress: () => handleArchive(item.id),
        }}
        leftAction={{
          label: 'Edit',
          color: theme.colors.accent,
          onPress: () => navigation.navigate('EditCategory', { categoryId: item.id }),
        }}
      >
        <Pressable
          style={[styles.categoryRow, { borderBottomColor: theme.colors.borderSubtle }]}
          onPress={() => navigation.navigate('CategoryDetail', { categoryId: item.id })}
        >
          <CategoryIcon icon={item.icon} color={item.color} size={40} />
          <View style={styles.categoryInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <StatusDot status={item.paceStatus} />
            </View>
            <ProgressBar
              spent={item.spentCents}
              budget={item.budgetedCents}
              height={4}
              color={item.color}
            />
            <View style={styles.amountsRow}>
              <MoneyText
                value={item.remainingCents}
                size="sm"
                color={
                  item.paceStatus === 'overspent'
                    ? theme.colors.danger
                    : item.paceStatus === 'warning'
                      ? theme.colors.warning
                      : theme.colors.textSecondary
                }
                animated={false}
              />
              <Text style={[styles.ofBudget, { color: theme.colors.textMuted }]}>
                {' '}left of{' '}
              </Text>
              <MoneyText
                value={item.budgetedCents}
                size="sm"
                color={theme.colors.textMuted}
                animated={false}
              />
            </View>
          </View>
        </Pressable>
      </SwipeRow>
    </MotiView>
  );

  const renderSectionHeader = ({ section }: { section: KindSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.bgPrimary }]}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
          {section.data.length}
        </Text>
      </View>
      <View style={styles.sectionMeta}>
        <MoneyText
          value={cents((section.totalBudgeted as number) - (section.totalSpent as number)) as MoneyCents}
          size="sm"
          color={theme.colors.textSecondary}
          animated={false}
        />
        <Text style={[styles.sectionMetaLabel, { color: theme.colors.textMuted }]}>
          {' '}remaining of{' '}
        </Text>
        <MoneyText
          value={section.totalBudgeted}
          size="sm"
          color={theme.colors.textMuted}
          animated={false}
        />
      </View>
    </View>
  );

  const renderSectionFooter = () => <View style={styles.sectionGap} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
          ENVELOPES
        </Text>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Categories</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => navigation.navigate('BudgetAllocation')}
              hitSlop={8}
              style={[styles.headerButton, { borderColor: theme.colors.borderDefault }]}
            >
              <Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>Allocate</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('CreateCategory')}
              hitSlop={8}
              style={[styles.headerButton, { backgroundColor: theme.colors.accent }]}
            >
              <Text style={[styles.headerButtonText, { color: theme.colors.bgPrimary }]}>+ Add</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {hasCategories ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      ) : (
        <EmptyState
          icon={'\u{1F4E6}'}
          title="No categories yet"
          description="Create categories to start budgeting"
          actionLabel="Add category"
          onAction={() => navigation.navigate('CreateCategory')}
        />
      )}

      {/* Allocation summary bar */}
      {hasCategories && (
        <PanelCard delay={0} style={styles.allocationBar}>
          <Pressable
            style={styles.allocationBarInner}
            onPress={() => navigation.navigate('BudgetAllocation')}
          >
            <View style={styles.allocationLeft}>
              <Text style={[styles.allocationLabel, { color: theme.colors.textMuted }]}>TOTAL ALLOCATED</Text>
              <View style={styles.allocationAmounts}>
                <MoneyText
                  value={cents(
                    MOCK_CATEGORIES.reduce((sum, c) => sum + (c.budgetedCents as number), 0)
                  ) as MoneyCents}
                  size="md"
                  color={theme.colors.textPrimary}
                  animated={false}
                />
                <Text style={[styles.allocationOf, { color: theme.colors.textMuted }]}> / </Text>
                <MoneyText
                  value={cents(500000) as MoneyCents}
                  size="md"
                  color={theme.colors.textMuted}
                  animated={false}
                />
              </View>
            </View>
            <Text style={[styles.allocationArrow, { color: theme.colors.accent }]}>{'\u2192'}</Text>
          </Pressable>
        </PanelCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 11,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  sectionMetaLabel: {
    fontSize: 12,
  },
  sectionGap: {
    height: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  categoryInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  amountsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ofBudget: {
    fontSize: 12,
  },
  allocationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  allocationBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  allocationLeft: {
    gap: 2,
  },
  allocationLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
  },
  allocationAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  allocationOf: {
    fontSize: 14,
  },
  allocationArrow: {
    fontSize: 20,
    fontWeight: '600',
  },
});
