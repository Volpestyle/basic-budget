import type {
  AlertService,
  BudgetService,
  CalculationService,
  CSVService,
  CategoryService,
  PeriodService,
  SettingsService,
  TransactionService,
} from '../../types/services';
import { AlertServiceImpl } from './alertService';
import { BudgetServiceImpl } from './budgetService';
import { CalculationServiceImpl } from './calculationService';
import { CategoryServiceImpl } from './categoryService';
import { createDefaultBackendContext, type BackendContext } from './context';
import { CsvServiceImpl } from './csvService';
import { PeriodServiceImpl } from './periodService';
import { SettingsServiceImpl } from './settingsService';
import { TransactionServiceImpl } from './transactionService';

export interface BackendServices {
  periodService: PeriodService;
  categoryService: CategoryService;
  budgetService: BudgetService;
  transactionService: TransactionService;
  calculationService: CalculationService;
  alertService: AlertService;
  csvService: CSVService;
  settingsService: SettingsService;
}

export const createServicesFromContext = (ctx: BackendContext): BackendServices => ({
  periodService: new PeriodServiceImpl(ctx),
  categoryService: new CategoryServiceImpl(ctx),
  budgetService: new BudgetServiceImpl(ctx),
  transactionService: new TransactionServiceImpl(ctx),
  calculationService: new CalculationServiceImpl(ctx),
  alertService: new AlertServiceImpl(ctx),
  csvService: new CsvServiceImpl(ctx),
  settingsService: new SettingsServiceImpl(ctx),
});

export const createBackendServices = async (): Promise<BackendServices> => {
  const ctx = await createDefaultBackendContext();
  return createServicesFromContext(ctx);
};

export * from './context';
