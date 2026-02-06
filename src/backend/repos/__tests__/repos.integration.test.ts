/** @jest-environment node */
/// <reference types="jest" />

import { cents, dateStr, timestamp, type Budget, type Category, type Period, type Transaction } from '../../../types/domain';
import { runMigrations } from '../../db/migrate';
import { BudgetsRepo } from '../budgetsRepo';
import { CategoriesRepo } from '../categoriesRepo';
import { PeriodsRepo } from '../periodsRepo';
import { SettingsRepo } from '../settingsRepo';
import { TransactionsRepo } from '../transactionsRepo';
import { AlertsRepo } from '../alertsRepo';
import { ImportBatchesRepo } from '../importBatchesRepo';
import { createSqliteTestContext } from '../../test/sqliteTestAdapter';

const BASE_TIMESTAMP = timestamp('2026-02-06T10:00:00.000Z');

describe('repository integration against sqlite', () => {
  it('persists and retrieves periods/categories/budgets/transactions/settings', async () => {
    const { adapter, close } = createSqliteTestContext();

    try {
      await runMigrations(adapter);

      const periodsRepo = new PeriodsRepo(adapter);
      const categoriesRepo = new CategoriesRepo(adapter);
      const budgetsRepo = new BudgetsRepo(adapter);
      const transactionsRepo = new TransactionsRepo(adapter);
      const settingsRepo = new SettingsRepo(adapter);

      const period: Period = {
        id: 'period-1',
        cycleType: 'monthly',
        startDate: dateStr('2026-02-01'),
        endDate: dateStr('2026-02-28'),
        incomeCents: cents(500000),
        createdAt: BASE_TIMESTAMP,
        closedAt: null,
      };

      const category: Category = {
        id: 'cat-groceries',
        name: 'Groceries',
        kind: 'need',
        icon: 'cart',
        color: '#34D399',
        archivedAt: null,
      };

      const budget: Budget = {
        id: 'budget-1',
        periodId: period.id,
        categoryId: category.id,
        cadence: 'weekly',
        amountCents: cents(12000),
        rolloverRule: 'pos',
        carryoverCents: cents(1000),
        createdAt: BASE_TIMESTAMP,
      };

      const txSpend: Transaction = {
        id: 'tx-1',
        date: dateStr('2026-02-05'),
        amountCents: cents(-4250),
        categoryId: category.id,
        periodId: period.id,
        merchant: 'Trader Joe\'s',
        note: null,
        source: 'manual',
        externalId: null,
        status: 'posted',
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
        deletedAt: null,
      };

      const txIncome: Transaction = {
        id: 'tx-2',
        date: dateStr('2026-02-06'),
        amountCents: cents(250000),
        categoryId: category.id,
        periodId: period.id,
        merchant: 'Paycheck',
        note: null,
        source: 'manual',
        externalId: null,
        status: 'posted',
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
        deletedAt: null,
      };

      const txDeleted: Transaction = {
        id: 'tx-3',
        date: dateStr('2026-02-07'),
        amountCents: cents(-1500),
        categoryId: category.id,
        periodId: period.id,
        merchant: 'Coffee Shop',
        note: null,
        source: 'manual',
        externalId: null,
        status: 'posted',
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
        deletedAt: null,
      };

      await periodsRepo.insert(period);
      await categoriesRepo.insert(category);
      await budgetsRepo.upsert(budget);
      await transactionsRepo.insert(txSpend);
      await transactionsRepo.insert(txIncome);
      await transactionsRepo.insert(txDeleted);
      await transactionsRepo.softDelete(txDeleted.id, timestamp('2026-02-07T12:00:00.000Z'));

      const current = await periodsRepo.getCurrentByDate(dateStr('2026-02-20'), 'monthly');
      expect(current?.id).toBe(period.id);

      const listedCategories = await categoriesRepo.list();
      expect(listedCategories).toHaveLength(1);
      expect(listedCategories[0]?.name).toBe('Groceries');

      const budgetRow = await budgetsRepo.getByPeriodAndCategory(period.id, category.id);
      expect(budgetRow?.cadence).toBe('weekly');
      expect(budgetRow?.carryoverCents).toBe(cents(1000));

      const listedTx = await transactionsRepo.list({ periodId: period.id });
      expect(listedTx.map((tx) => tx.id)).toEqual(['tx-2', 'tx-1']);

      const spentInPeriod = await transactionsRepo.sumSpentInPeriod(period.id, category.id);
      expect(spentInPeriod).toBe(cents(4250));

      const spentInRange = await transactionsRepo.sumSpentInDateRange({
        periodId: period.id,
        categoryId: category.id,
        startDate: dateStr('2026-02-01'),
        endDate: dateStr('2026-02-06'),
      });
      expect(spentInRange).toBe(cents(4250));

      const settingsBefore = await settingsRepo.get();
      expect(settingsBefore.cycleType).toBe('monthly');
      expect(settingsBefore.weekStart).toBe(1);

      const settingsAfter = await settingsRepo.update({
        cycleType: 'biweekly',
        weekStart: 0,
        biweeklyAnchorDate: dateStr('2026-02-06'),
      });
      expect(settingsAfter.cycleType).toBe('biweekly');
      expect(settingsAfter.weekStart).toBe(0);
      expect(settingsAfter.biweeklyAnchorDate).toBe(dateStr('2026-02-06'));
    } finally {
      close();
    }
  });

  it('upserts budgets and handles alerts/import batches', async () => {
    const { adapter, close } = createSqliteTestContext();

    try {
      await runMigrations(adapter);

      const periodsRepo = new PeriodsRepo(adapter);
      const categoriesRepo = new CategoriesRepo(adapter);
      const budgetsRepo = new BudgetsRepo(adapter);
      const alertsRepo = new AlertsRepo(adapter);
      const importBatchesRepo = new ImportBatchesRepo(adapter);

      const period: Period = {
        id: 'period-2',
        cycleType: 'monthly',
        startDate: dateStr('2026-03-01'),
        endDate: dateStr('2026-03-31'),
        incomeCents: cents(520000),
        createdAt: BASE_TIMESTAMP,
        closedAt: null,
      };

      const category: Category = {
        id: 'cat-dining',
        name: 'Dining',
        kind: 'want',
        icon: 'food',
        color: '#FB923C',
        archivedAt: null,
      };

      await periodsRepo.insert(period);
      await categoriesRepo.insert(category);

      await budgetsRepo.upsert({
        id: 'budget-2',
        periodId: period.id,
        categoryId: category.id,
        cadence: 'monthly',
        amountCents: cents(20000),
        rolloverRule: 'reset',
        carryoverCents: cents(0),
        createdAt: BASE_TIMESTAMP,
      });

      await budgetsRepo.upsert({
        id: 'budget-2-new-id',
        periodId: period.id,
        categoryId: category.id,
        cadence: 'monthly',
        amountCents: cents(25000),
        rolloverRule: 'pos_neg',
        carryoverCents: cents(-1500),
        createdAt: BASE_TIMESTAMP,
      });

      const budget = await budgetsRepo.getByPeriodAndCategory(period.id, category.id);
      expect(budget?.id).toBe('budget-2');
      expect(budget?.amountCents).toBe(cents(25000));
      expect(budget?.rolloverRule).toBe('pos_neg');
      expect(budget?.carryoverCents).toBe(cents(-1500));

      const defaultRule = await alertsRepo.getRule(category.id);
      expect(defaultRule.approachingLimitPercent).toBe(80);
      expect(defaultRule.enabled).toBe(true);

      await alertsRepo.setRule({
        categoryId: category.id,
        approachingLimitPercent: 90,
        enabled: true,
      });

      const configuredRule = await alertsRepo.getRule(category.id);
      expect(configuredRule.approachingLimitPercent).toBe(90);

      await alertsRepo.insert({
        id: 'alert-1',
        categoryId: category.id,
        periodId: period.id,
        type: 'approaching_limit',
        thresholdPercent: 90,
        triggeredAt: timestamp('2026-03-10T12:00:00.000Z'),
        dismissedAt: null,
      });

      let alerts = await alertsRepo.listOpenByPeriodAndCategory(period.id, category.id);
      expect(alerts).toHaveLength(1);

      await alertsRepo.dismiss('alert-1', timestamp('2026-03-11T12:00:00.000Z'));
      alerts = await alertsRepo.listOpenByPeriodAndCategory(period.id, category.id);
      expect(alerts).toHaveLength(0);

      await importBatchesRepo.insert({
        id: 'batch-1',
        source: 'csv',
        periodId: period.id,
        startedAt: timestamp('2026-03-12T12:00:00.000Z'),
        finishedAt: null,
        importedCount: 0,
        duplicatesCount: 0,
        errorCount: 0,
        notes: null,
      });

      await importBatchesRepo.finish('batch-1', {
        finishedAt: timestamp('2026-03-12T12:01:00.000Z'),
        importedCount: 12,
        duplicatesCount: 2,
        errorCount: 1,
        notes: 'Completed with one parse warning',
      });

      const batchRows = await adapter.getAll<{
        id: string;
        imported_count: number;
        duplicates_count: number;
        error_count: number;
      }>('SELECT id, imported_count, duplicates_count, error_count FROM import_batches WHERE id = ?', ['batch-1']);

      expect(batchRows).toEqual([
        {
          id: 'batch-1',
          imported_count: 12,
          duplicates_count: 2,
          error_count: 1,
        },
      ]);
    } finally {
      close();
    }
  });
});
