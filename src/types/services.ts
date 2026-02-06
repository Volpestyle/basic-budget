// ============================================================
// services.ts — Service interfaces (backend contract)
// Frontend codes against these interfaces.
// Backend implements them with real SQLite + domain logic.
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
  WeekDay,
  CycleType,
  Cadence,
  RolloverRule,
  CategoryKind,
  TransactionSource,
  TransactionStatus,
  PaceStatus,
} from './domain';

// --- Input types ----------------------------------------------------------

export interface CreatePeriodInput {
  cycleType: CycleType;
  startDate: DateString;
  endDate: DateString;
  incomeCents: MoneyCents;
}

export interface CreateCategoryInput {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
}

export interface UpdateCategoryInput {
  name?: string;
  kind?: CategoryKind;
  icon?: string;
  color?: string;
}

export interface UpsertBudgetInput {
  periodId: string;
  categoryId: string;
  cadence: Cadence;
  amountCents: MoneyCents;
  rolloverRule: RolloverRule;
}

export interface CreateTransactionInput {
  date: DateString;
  amountCents: MoneyCents;
  categoryId: string;
  periodId: string;
  merchant?: string;
  note?: string;
  source?: TransactionSource;
}

export interface UpdateTransactionInput {
  date?: DateString;
  amountCents?: MoneyCents;
  categoryId?: string;
  merchant?: string | null;
  note?: string | null;
}

export interface TransactionFilter {
  periodId?: string;
  categoryId?: string;
  startDate?: DateString;
  endDate?: DateString;
  source?: TransactionSource;
  status?: TransactionStatus;
}

// --- Computed / summary types ---------------------------------------------

export interface LeftToSpend {
  remainingPeriodCents: MoneyCents;
  leftTodayCents: MoneyCents;
  leftThisWeekCents: MoneyCents;
  isOverspent: boolean;
  overspentCents: MoneyCents; // 0 when not overspent
}

export interface CategorySummary {
  categoryId: string;
  category: Category;
  budget: Budget;
  budgetedPeriodCents: MoneyCents; // total for period (weekly cadence expanded)
  spentCents: MoneyCents;
  remainingCents: MoneyCents;
  carryoverCents: MoneyCents;
  leftToSpend: LeftToSpend;
  paceStatus: PaceStatus;
}

export interface BudgetSummary {
  periodId: string;
  period: Period;
  totalIncomeCents: MoneyCents;
  totalAllocatedCents: MoneyCents;
  totalSpentCents: MoneyCents;
  totalRemainingCents: MoneyCents;
  unallocatedCents: MoneyCents;
  categories: CategorySummary[];
}

export interface CSVImportResult {
  imported: number;
  duplicatesSkipped: number;
  errors: string[];
}

// --- Service interfaces ---------------------------------------------------

export interface PeriodService {
  getCurrentPeriod(): Promise<Period | null>;
  getPeriod(id: string): Promise<Period | null>;
  createPeriod(input: CreatePeriodInput): Promise<Period>;
  createNextPeriod(): Promise<Period>;
  closePeriod(periodId: string): Promise<void>;
  listPeriods(): Promise<Period[]>;
}

export interface CategoryService {
  createCategory(input: CreateCategoryInput): Promise<Category>;
  updateCategory(id: string, input: UpdateCategoryInput): Promise<Category>;
  archiveCategory(id: string): Promise<void>;
  getCategory(id: string): Promise<Category | null>;
  listCategories(includeArchived?: boolean): Promise<Category[]>;
}

export interface BudgetService {
  upsertBudget(input: UpsertBudgetInput): Promise<Budget>;
  getBudgetSummary(periodId: string, date: DateString, weekStart: WeekDay): Promise<BudgetSummary>;
  getCategorySummary(periodId: string, categoryId: string, date: DateString, weekStart: WeekDay): Promise<CategorySummary>;
  applyRollovers(fromPeriodId: string, toPeriodId: string): Promise<void>;
}

export interface TransactionService {
  addTransaction(input: CreateTransactionInput): Promise<Transaction>;
  updateTransaction(id: string, patch: UpdateTransactionInput): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  getTransaction(id: string): Promise<Transaction | null>;
  listTransactions(filter: TransactionFilter): Promise<Transaction[]>;
}

export interface CalculationService {
  computeLeftToSpend(
    periodId: string,
    categoryId: string,
    date: DateString,
    weekStart: WeekDay,
  ): Promise<LeftToSpend>;
  computePaceStatus(
    periodId: string,
    categoryId: string,
    date: DateString,
  ): Promise<PaceStatus>;
}

export interface AlertService {
  evaluateAlerts(periodId: string, date: DateString): Promise<Alert[]>;
  dismissAlert(alertId: string): Promise<void>;
  getAlertRules(categoryId: string): Promise<AlertRule>;
  setAlertRule(rule: AlertRule): Promise<void>;
}

export interface CSVService {
  exportTransactions(periodId?: string): Promise<string>;
  exportBudgetSnapshot(periodId: string): Promise<string>;
  importTransactions(csvContent: string, periodId: string): Promise<CSVImportResult>;
}

export interface SettingsService {
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
}
