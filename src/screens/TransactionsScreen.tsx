import React from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MotiView } from 'moti';
import { useTheme } from '../theme/ThemeProvider';
import { MoneyText } from '../components/MoneyText';
import { CategoryIcon } from '../components/CategoryIcon';
import { SwipeRow } from '../components/SwipeRow';
import { FAB } from '../components/FAB';
import { EmptyState } from '../components/EmptyState';
import type { RootStackParamList } from '../app/AppNavigator';
import type { MoneyCents } from '../types/domain';
import { cents } from '../types/domain';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// TODO: Replace with real data from Zustand store
interface MockTransaction {
  id: string;
  merchant: string;
  categoryIcon: string;
  categoryColor: string;
  categoryName: string;
  amountCents: MoneyCents;
  note: string | null;
}

interface DateSection {
  title: string;
  data: MockTransaction[];
}

const MOCK_SECTIONS: DateSection[] = [
  {
    title: 'Today — Feb 5',
    data: [
      { id: '1', merchant: 'Trader Joe\'s', categoryIcon: 'cart', categoryColor: '#34D399', categoryName: 'Groceries', amountCents: cents(-4250) as MoneyCents, note: null },
      { id: '2', merchant: 'Starbucks', categoryIcon: 'coffee', categoryColor: '#A3876A', categoryName: 'Coffee', amountCents: cents(-595) as MoneyCents, note: 'Morning latte' },
    ],
  },
  {
    title: 'Yesterday — Feb 4',
    data: [
      { id: '3', merchant: 'Uber', categoryIcon: 'car', categoryColor: '#60A5FA', categoryName: 'Transport', amountCents: cents(-1850) as MoneyCents, note: null },
      { id: '4', merchant: 'Netflix', categoryIcon: 'movie', categoryColor: '#F472B6', categoryName: 'Entertainment', amountCents: cents(-1599) as MoneyCents, note: 'Monthly sub' },
    ],
  },
  {
    title: 'Feb 3',
    data: [
      { id: '5', merchant: 'Whole Foods', categoryIcon: 'cart', categoryColor: '#34D399', categoryName: 'Groceries', amountCents: cents(-8730) as MoneyCents, note: null },
      { id: '6', merchant: 'Chipotle', categoryIcon: 'food', categoryColor: '#FB923C', categoryName: 'Dining', amountCents: cents(-1245) as MoneyCents, note: null },
      { id: '7', merchant: 'Amazon', categoryIcon: 'shirt', categoryColor: '#38BDF8', categoryName: 'Shopping', amountCents: cents(-3499) as MoneyCents, note: 'Phone case' },
    ],
  },
];

export function TransactionsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const renderItem = ({ item, index }: { item: MockTransaction; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250, delay: index * 30 }}
    >
      <SwipeRow
        rightAction={{
          label: 'Delete',
          color: theme.colors.danger,
          onPress: () => {
            // TODO: Wire to store deleteTransaction
          },
        }}
        leftAction={{
          label: 'Edit',
          color: theme.colors.accent,
          onPress: () => {
            // TODO: Navigate to edit
          },
        }}
      >
        <Pressable style={[styles.txRow, { borderBottomColor: theme.colors.borderSubtle }]}>
          <CategoryIcon icon={item.categoryIcon} color={item.categoryColor} size={36} />
          <View style={styles.txInfo}>
            <Text style={[styles.txMerchant, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.merchant}
            </Text>
            <Text style={[styles.txCategory, { color: theme.colors.textMuted }]}>
              {item.categoryName}
              {item.note ? ` \u00B7 ${item.note}` : ''}
            </Text>
          </View>
          <MoneyText
            value={item.amountCents}
            size="sm"
            color={theme.colors.textPrimary}
            animated={false}
          />
        </Pressable>
      </SwipeRow>
    </MotiView>
  );

  const renderSectionHeader = ({ section }: { section: DateSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.bgPrimary }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
        {section.title.toUpperCase()}
      </Text>
    </View>
  );

  const hasTransactions = MOCK_SECTIONS.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
          ACTIVITY
        </Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Transactions</Text>
      </View>

      {hasTransactions ? (
        <SectionList
          sections={MOCK_SECTIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      ) : (
        <EmptyState
          icon={'\u{1F4B8}'}
          title="No transactions yet"
          description="Tap + to add your first transaction"
          actionLabel="Add transaction"
          onAction={() => navigation.navigate('AddTransaction')}
        />
      )}

      <FAB onPress={() => navigation.navigate('AddTransaction')} />
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
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txMerchant: {
    fontSize: 15,
    fontWeight: '500',
  },
  txCategory: {
    fontSize: 12,
  },
});
