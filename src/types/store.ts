// ============================================================
// store.ts — Zustand store slice shapes + chart data types
// Frontend owns these types. Backend populates the store.
// ============================================================

import type {
  Period,
  Category,
  Budget,
  Transaction,
  Settings,
  Alert,
  AlertRule,
  MoneyCents,
  DateString,
  PaceStatus,
  CategoryKind,
  Cadence,
  RolloverRule,
  CycleType,
  WeekDay,
} from './domain';

import type {
  BudgetSummary,
  CategorySummary,
  LeftToSpend,
  TransactionFilter,
  CreateCategoryInput,
  UpdateCategoryInput,
  UpsertBudgetInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  CSVImportResult,
} from './services';

// --- Store slices ---------------------------------------------------------

export interface SettingsSlice {
  settings: Settings | null;
  settingsLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

export interface PeriodSlice {
  currentPeriod: Period | null;
  periods: Period[];
  selectedPeriodId: string | null;
  loadCurrentPeriod: () => Promise<void>;
  loadPeriods: () => Promise<void>;
  selectPeriod: (id: string) => void;
  createNextPeriod: () => Promise<Period>;
  closePeriod: (id: string) => Promise<void>;
}

export interface CategorySlice {
  categories: Category[];
  loadCategories: () => Promise<void>;
  createCategory: (input: CreateCategoryInput) => Promise<Category>;
  updateCategory: (id: string, input: UpdateCategoryInput) => Promise<Category>;
  archiveCategory: (id: string) => Promise<void>;
}

export interface BudgetSlice {
  budgetSummary: BudgetSummary | null;
  categorySummaries: Record<string, CategorySummary>;
  loadBudgetSummary: () => Promise<void>;
  loadCategorySummary: (categoryId: string) => Promise<void>;
  upsertBudget: (input: UpsertBudgetInput) => Promise<void>;
  applyRollovers: (fromPeriodId: string, toPeriodId: string) => Promise<void>;
}

export interface TransactionSlice {
  transactions: Transaction[];
  transactionFilter: TransactionFilter;
  loadTransactions: () => Promise<void>;
  addTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, patch: UpdateTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  setTransactionFilter: (filter: TransactionFilter) => void;
}

export interface AlertSlice {
  alerts: Alert[];
  alertRules: Record<string, AlertRule>;
  loadAlerts: () => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  setAlertRule: (rule: AlertRule) => Promise<void>;
}

export interface OnboardingSlice {
  onboardingComplete: boolean;
  currentStep: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;
}

export type OnboardingStep = 'cycle' | 'income' | 'categories' | 'allocations' | 'done';

/** Combined store — all slices merged into one Zustand store */
export type AppStore =
  SettingsSlice &
  PeriodSlice &
  CategorySlice &
  BudgetSlice &
  TransactionSlice &
  AlertSlice &
  OnboardingSlice;

// --- Chart data types (frontend-owned) ------------------------------------

export interface DonutSegment {
  categoryId: string;
  label: string;
  valueCents: MoneyCents;
  color: string;
  percentage: number; // 0–100
}

export interface LineDataPoint {
  dayIndex: number; // 0-based day within period
  date: DateString;
  valueCents: MoneyCents;
}

export interface CumulativeSpendSeries {
  actual: LineDataPoint[];
  budgetPace: LineDataPoint[];
  periodStartDate: DateString;
  periodEndDate: DateString;
}

export interface BurnDownSeries {
  remaining: LineDataPoint[];
  idealPace: LineDataPoint[];
  budgetedCents: MoneyCents;
}

export interface WeeklyBarDatum {
  weekIndex: number;
  weekLabel: string; // e.g. "Feb 3–9"
  weekStartDate: DateString;
  spentCents: MoneyCents;
  budgetCents: MoneyCents;
}

// --- Dashboard composite types --------------------------------------------

export interface DashboardTile {
  label: string;
  valueCents: MoneyCents;
  paceStatus: PaceStatus;
}

export interface DashboardHighlight {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  leftToSpend: LeftToSpend;
  paceStatus: PaceStatus;
}

export interface DashboardData {
  period: Period;
  totalRemainingCents: MoneyCents;
  totalSpentCents: MoneyCents;
  totalBudgetedCents: MoneyCents;
  safeTodayCents: MoneyCents; // sum of all left-today
  highlights: DashboardHighlight[]; // top categories to show
  donutData: DonutSegment[];
  cumulativeSpend: CumulativeSpendSeries;
}

// --- Selector return types ------------------------------------------------

export interface CategoryListItem {
  category: Category;
  remainingCents: MoneyCents;
  paceStatus: PaceStatus;
  budgetedCents: MoneyCents;
  spentCents: MoneyCents;
}

export interface CategoryDetailData {
  category: Category;
  budget: Budget;
  summary: CategorySummary;
  leftToSpend: LeftToSpend;
  burnDown: BurnDownSeries;
  recentTransactions: Transaction[];
}

export interface InsightsData {
  donutData: DonutSegment[];
  cumulativeSpend: CumulativeSpendSeries;
  selectedBurnDown: BurnDownSeries | null;
  weeklyBars: WeeklyBarDatum[] | null;
  periodComparison: PeriodComparisonData | null;
}

export interface PeriodComparisonData {
  currentPeriodId: string;
  previousPeriodId: string;
  currentTotalSpent: MoneyCents;
  previousTotalSpent: MoneyCents;
  categoryDeltas: CategoryDelta[];
}

export interface CategoryDelta {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  currentSpent: MoneyCents;
  previousSpent: MoneyCents;
  deltaCents: MoneyCents; // positive = spent more this period
}
