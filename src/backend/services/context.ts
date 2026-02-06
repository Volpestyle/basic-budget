import { getDatabase } from '../db';
import type { DatabaseAdapter } from '../db/types';
import { systemClock, type Clock } from '../infra/clock';
import { consoleLogger, type Logger } from '../infra/logger';
import { systemUuidProvider, type UuidProvider } from '../infra/uuid';
import { AlertsRepo } from '../repos/alertsRepo';
import { BudgetsRepo } from '../repos/budgetsRepo';
import { CategoriesRepo } from '../repos/categoriesRepo';
import { ImportBatchesRepo } from '../repos/importBatchesRepo';
import { PeriodsRepo } from '../repos/periodsRepo';
import { SettingsRepo } from '../repos/settingsRepo';
import { TransactionsRepo } from '../repos/transactionsRepo';

export type Repositories = {
  periods: PeriodsRepo;
  categories: CategoriesRepo;
  budgets: BudgetsRepo;
  transactions: TransactionsRepo;
  settings: SettingsRepo;
  alerts: AlertsRepo;
  importBatches: ImportBatchesRepo;
};

export interface BackendContext {
  db: DatabaseAdapter;
  repos: Repositories;
  clock: Clock;
  uuid: UuidProvider;
  logger: Logger;
}

export const createRepositories = (db: DatabaseAdapter): Repositories => ({
  periods: new PeriodsRepo(db),
  categories: new CategoriesRepo(db),
  budgets: new BudgetsRepo(db),
  transactions: new TransactionsRepo(db),
  settings: new SettingsRepo(db),
  alerts: new AlertsRepo(db),
  importBatches: new ImportBatchesRepo(db),
});

export const createDefaultBackendContext = async (): Promise<BackendContext> => {
  const db = await getDatabase();
  return {
    db,
    repos: createRepositories(db),
    clock: systemClock,
    uuid: systemUuidProvider,
    logger: consoleLogger,
  };
};
