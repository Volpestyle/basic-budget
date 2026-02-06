import { create } from 'zustand';

import { resolveCurrentPeriodRange } from '../backend/domain/periods';
import { getTodayDateString } from './date';
import { getBackendServices } from './serviceRuntime';
import type {
  Category,
  CategoryKind,
  CycleType,
  MoneyCents,
  Period,
  Settings,
  WeekDay,
} from '../types/domain';
import type {
  CategorySummary,
  CreateCategoryInput,
  CreateTransactionInput,
  TransactionFilter,
  UpdateCategoryInput,
  UpsertBudgetInput,
  UpdateTransactionInput,
} from '../types/services';
import type { AppStore, OnboardingStep } from '../types/store';

export interface OnboardingBootstrapInput {
  cycleType: CycleType;
  weekStart: WeekDay;
  incomeCents: MoneyCents;
  categories: {
    name: string;
    icon: string;
    color: string;
    kind: CategoryKind;
  }[];
}

interface AppStoreInternal {
  initialized: boolean;
  initializing: boolean;
  initializationError: string | null;
  bootstrapApp: () => Promise<void>;
  completeOnboardingData: (input: OnboardingBootstrapInput) => Promise<void>;
}

const DEFAULT_WEEK_START = 1 as WeekDay;

const effectivePeriodId = (state: AppStore): string | null => state.selectedPeriodId ?? state.currentPeriod?.id ?? null;

const today = () => getTodayDateString();

const getWeekStart = (settings: Settings | null): WeekDay => settings?.weekStart ?? DEFAULT_WEEK_START;

const mapCategorySummaries = (categories: CategorySummary[]): Record<string, CategorySummary> => {
  return categories.reduce<Record<string, CategorySummary>>((acc, item) => {
    acc[item.categoryId] = item;
    return acc;
  }, {});
};

export const useAppStore = create<AppStore & AppStoreInternal>((set, get) => ({
  settings: null,
  settingsLoaded: false,
  currentPeriod: null,
  periods: [],
  selectedPeriodId: null,
  categories: [],
  budgetSummary: null,
  categorySummaries: {},
  transactions: [],
  transactionFilter: {},
  alerts: [],
  alertRules: {},
  onboardingComplete: false,
  currentStep: 'cycle',

  initialized: false,
  initializing: false,
  initializationError: null,

  loadSettings: async () => {
    const services = await getBackendServices();
    const settings = await services.settingsService.getSettings();
    set({ settings, settingsLoaded: true });
  },

  updateSettings: async (patch) => {
    const services = await getBackendServices();
    const settings = await services.settingsService.updateSettings(patch);
    set({ settings, settingsLoaded: true });
  },

  loadCurrentPeriod: async () => {
    const services = await getBackendServices();
    const currentPeriod = await services.periodService.getCurrentPeriod();

    set((state) => ({
      currentPeriod,
      selectedPeriodId: state.selectedPeriodId ?? currentPeriod?.id ?? null,
    }));
  },

  loadPeriods: async () => {
    const services = await getBackendServices();
    const periods = await services.periodService.listPeriods();

    set((state) => ({
      periods,
      selectedPeriodId: state.selectedPeriodId ?? periods[0]?.id ?? null,
    }));
  },

  selectPeriod: (id) => {
    set((state) => ({
      selectedPeriodId: id,
      transactionFilter: {
        ...state.transactionFilter,
        periodId: id,
      },
    }));
  },

  createNextPeriod: async () => {
    const services = await getBackendServices();
    const next = await services.periodService.createNextPeriod();

    set((state) => ({
      periods: [next, ...state.periods.filter((period) => period.id !== next.id)],
      currentPeriod: next,
      selectedPeriodId: next.id,
    }));

    return next;
  },

  closePeriod: async (id) => {
    const services = await getBackendServices();
    await services.periodService.closePeriod(id);

    const periods = await services.periodService.listPeriods();
    const current = await services.periodService.getCurrentPeriod();

    set((state) => ({
      periods,
      currentPeriod: current,
      selectedPeriodId: state.selectedPeriodId === id ? current?.id ?? null : state.selectedPeriodId,
    }));
  },

  loadCategories: async () => {
    const services = await getBackendServices();
    const categories = await services.categoryService.listCategories();
    set({ categories });
  },

  createCategory: async (input: CreateCategoryInput) => {
    const services = await getBackendServices();
    const created = await services.categoryService.createCategory(input);
    set((state) => ({ categories: [...state.categories, created] }));
    return created;
  },

  updateCategory: async (id: string, input: UpdateCategoryInput) => {
    const services = await getBackendServices();
    const updated = await services.categoryService.updateCategory(id, input);
    set((state) => ({
      categories: state.categories.map((category) => (category.id === updated.id ? updated : category)),
    }));
    return updated;
  },

  archiveCategory: async (id: string) => {
    const services = await getBackendServices();
    await services.categoryService.archiveCategory(id);
    const categories = await services.categoryService.listCategories();
    set({ categories });
  },

  loadBudgetSummary: async () => {
    const services = await getBackendServices();
    const state = get();
    const periodId = effectivePeriodId(state);

    if (!periodId) {
      set({ budgetSummary: null, categorySummaries: {} });
      return;
    }

    const summary = await services.budgetService.getBudgetSummary(periodId, today(), getWeekStart(state.settings));

    set({
      budgetSummary: summary,
      categorySummaries: mapCategorySummaries(summary.categories),
    });
  },

  loadCategorySummary: async (categoryId: string) => {
    const services = await getBackendServices();
    const state = get();
    const periodId = effectivePeriodId(state);

    if (!periodId) {
      return;
    }

    const summary = await services.budgetService.getCategorySummary(
      periodId,
      categoryId,
      today(),
      getWeekStart(state.settings),
    );

    set((prev) => ({
      categorySummaries: {
        ...prev.categorySummaries,
        [categoryId]: summary,
      },
    }));
  },

  upsertBudget: async (input: UpsertBudgetInput) => {
    const services = await getBackendServices();
    await services.budgetService.upsertBudget(input);

    await Promise.all([get().loadBudgetSummary(), get().loadCategorySummary(input.categoryId)]);
  },

  applyRollovers: async (fromPeriodId, toPeriodId) => {
    const services = await getBackendServices();
    await services.budgetService.applyRollovers(fromPeriodId, toPeriodId);
    await get().loadBudgetSummary();
  },

  loadTransactions: async () => {
    const services = await getBackendServices();
    const state = get();
    const periodId = effectivePeriodId(state);

    const filter: TransactionFilter = {
      ...state.transactionFilter,
      periodId: state.transactionFilter.periodId ?? periodId ?? undefined,
    };

    const transactions = await services.transactionService.listTransactions(filter);
    set({ transactions });
  },

  addTransaction: async (input: CreateTransactionInput) => {
    const services = await getBackendServices();
    const tx = await services.transactionService.addTransaction(input);

    await Promise.all([get().loadTransactions(), get().loadBudgetSummary(), get().loadAlerts()]);
    return tx;
  },

  updateTransaction: async (id: string, patch: UpdateTransactionInput) => {
    const services = await getBackendServices();
    const tx = await services.transactionService.updateTransaction(id, patch);

    await Promise.all([get().loadTransactions(), get().loadBudgetSummary(), get().loadAlerts()]);
    return tx;
  },

  deleteTransaction: async (id: string) => {
    const services = await getBackendServices();
    await services.transactionService.deleteTransaction(id);

    await Promise.all([get().loadTransactions(), get().loadBudgetSummary(), get().loadAlerts()]);
  },

  setTransactionFilter: (filter: TransactionFilter) => {
    set({ transactionFilter: filter });
  },

  loadAlerts: async () => {
    const services = await getBackendServices();
    const state = get();
    const periodId = effectivePeriodId(state);

    if (!periodId) {
      set({ alerts: [] });
      return;
    }

    const alerts = await services.alertService.evaluateAlerts(periodId, today());

    const alertRules: Record<string, Awaited<ReturnType<typeof services.alertService.getAlertRules>>> = {
      ...state.alertRules,
    };

    for (const category of state.categories) {
      if (!alertRules[category.id]) {
        alertRules[category.id] = await services.alertService.getAlertRules(category.id);
      }
    }

    set({ alerts, alertRules });
  },

  dismissAlert: async (id: string) => {
    const services = await getBackendServices();
    await services.alertService.dismissAlert(id);
    await get().loadAlerts();
  },

  setAlertRule: async (rule) => {
    const services = await getBackendServices();
    await services.alertService.setAlertRule(rule);

    set((state) => ({
      alertRules: {
        ...state.alertRules,
        [rule.categoryId]: rule,
      },
    }));
  },

  setStep: (step: OnboardingStep) => {
    set({ currentStep: step });
  },

  completeOnboarding: () => {
    set({ onboardingComplete: true, currentStep: 'done' });
  },

  bootstrapApp: async () => {
    if (get().initializing) {
      return;
    }

    set({ initializing: true, initializationError: null });

    try {
      const services = await getBackendServices();

      const [settings, periods, currentPeriod, categories] = await Promise.all([
        services.settingsService.getSettings(),
        services.periodService.listPeriods(),
        services.periodService.getCurrentPeriod(),
        services.categoryService.listCategories(),
      ]);

      const selectedPeriodId = currentPeriod?.id ?? periods[0]?.id ?? null;
      const onboardingComplete = periods.length > 0 && categories.length > 0;

      set((state) => ({
        settings,
        settingsLoaded: true,
        periods,
        currentPeriod,
        selectedPeriodId,
        categories,
        transactionFilter: {
          ...state.transactionFilter,
          periodId: state.transactionFilter.periodId ?? selectedPeriodId ?? undefined,
        },
        onboardingComplete,
        currentStep: onboardingComplete ? 'done' : 'cycle',
        initialized: true,
        initializing: false,
        initializationError: null,
      }));

      if (selectedPeriodId) {
        await Promise.all([get().loadBudgetSummary(), get().loadTransactions(), get().loadAlerts()]);
      } else {
        set({
          budgetSummary: null,
          categorySummaries: {},
          transactions: [],
          alerts: [],
        });
      }
    } catch (error) {
      set({
        initializing: false,
        initialized: false,
        initializationError: error instanceof Error ? error.message : 'Unknown bootstrap error',
      });
    }
  },

  completeOnboardingData: async (input: OnboardingBootstrapInput) => {
    set({ initializing: true, initializationError: null });

    try {
      const services = await getBackendServices();
      const todayDate = today();
      const biweeklyAnchorDate = input.cycleType === 'biweekly' ? todayDate : null;

      await services.settingsService.updateSettings({
        cycleType: input.cycleType,
        weekStart: input.weekStart,
        biweeklyAnchorDate,
      });

      let currentPeriod: Period | null = await services.periodService.getCurrentPeriod();
      if (!currentPeriod) {
        const range = resolveCurrentPeriodRange(input.cycleType, todayDate, biweeklyAnchorDate);
        currentPeriod = await services.periodService.createPeriod({
          cycleType: input.cycleType,
          startDate: range.startDate,
          endDate: range.endDate,
          incomeCents: input.incomeCents,
        });
      }

      const existingCategories = await services.categoryService.listCategories(true);
      const existingByName = new Set(existingCategories.map((category) => category.name.trim().toLowerCase()));

      for (const category of input.categories) {
        const nameKey = category.name.trim().toLowerCase();
        if (existingByName.has(nameKey)) {
          continue;
        }

        await services.categoryService.createCategory({
          name: category.name,
          icon: category.icon,
          color: category.color,
          kind: category.kind,
        });
        existingByName.add(nameKey);
      }

      set({ onboardingComplete: true, currentStep: 'done', initializing: false });
      await get().bootstrapApp();
    } catch (error) {
      set({
        initializing: false,
        initializationError: error instanceof Error ? error.message : 'Failed completing onboarding',
      });
    }
  },
}));

export const useAppStoreStatus = () =>
  useAppStore((state) => ({
    initialized: state.initialized,
    initializing: state.initializing,
    initializationError: state.initializationError,
  }));
