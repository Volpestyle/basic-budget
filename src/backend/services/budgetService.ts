import type { DateString, Budget, WeekDay } from '../../types/domain';
import type {
  BudgetService,
  BudgetSummary,
  CategorySummary,
  UpsertBudgetInput,
} from '../../types/services';
import { asMoney, zeroMoney } from '../domain/money';
import { computeCarryoverFromRemaining } from '../domain/rollover';
import type { BackendContext } from './context';
import { assert, requireValue } from './internal';
import { buildBudgetSummary, buildCategorySummary } from './summary';

export class BudgetServiceImpl implements BudgetService {
  constructor(private readonly ctx: BackendContext) {}

  async upsertBudget(input: UpsertBudgetInput): Promise<Budget> {
    assert(input.amountCents >= 0, 'Budget amount must be >= 0');

    requireValue(await this.ctx.repos.periods.getById(input.periodId), `Period not found: ${input.periodId}`);
    requireValue(await this.ctx.repos.categories.getById(input.categoryId), `Category not found: ${input.categoryId}`);

    const existing = await this.ctx.repos.budgets.getByPeriodAndCategory(input.periodId, input.categoryId);

    const budget: Budget = {
      id: existing?.id ?? this.ctx.uuid.next(),
      periodId: input.periodId,
      categoryId: input.categoryId,
      cadence: input.cadence,
      amountCents: input.amountCents,
      rolloverRule: input.rolloverRule,
      carryoverCents: existing?.carryoverCents ?? zeroMoney(),
      createdAt: existing?.createdAt ?? this.ctx.clock.now(),
    };

    await this.ctx.repos.budgets.upsert(budget);
    return budget;
  }

  async getBudgetSummary(periodId: string, date: DateString, weekStart: WeekDay): Promise<BudgetSummary> {
    const period = requireValue(await this.ctx.repos.periods.getById(periodId), `Period not found: ${periodId}`);
    return buildBudgetSummary({
      ctx: this.ctx,
      period,
      date,
      weekStart,
    });
  }

  async getCategorySummary(
    periodId: string,
    categoryId: string,
    date: DateString,
    weekStart: WeekDay,
  ): Promise<CategorySummary> {
    const [period, category, budget] = await Promise.all([
      this.ctx.repos.periods.getById(periodId),
      this.ctx.repos.categories.getById(categoryId),
      this.ctx.repos.budgets.getByPeriodAndCategory(periodId, categoryId),
    ]);

    return buildCategorySummary({
      ctx: this.ctx,
      period: requireValue(period, `Period not found: ${periodId}`),
      category: requireValue(category, `Category not found: ${categoryId}`),
      budget: requireValue(budget, `Budget not found for category ${categoryId} in period ${periodId}`),
      date,
      weekStart,
    });
  }

  async applyRollovers(fromPeriodId: string, toPeriodId: string): Promise<void> {
    const [fromPeriodRaw, toPeriodRaw, settings] = await Promise.all([
      this.ctx.repos.periods.getById(fromPeriodId),
      this.ctx.repos.periods.getById(toPeriodId),
      this.ctx.repos.settings.get(),
    ]);

    const fromPeriod = requireValue(fromPeriodRaw, `Period not found: ${fromPeriodId}`);
    requireValue(toPeriodRaw, `Period not found: ${toPeriodId}`);

    const fromBudgets = await this.ctx.repos.budgets.getByPeriod(fromPeriodId);

    for (const fromBudget of fromBudgets) {
      const category = await this.ctx.repos.categories.getById(fromBudget.categoryId);
      if (!category) {
        continue;
      }

      const summary = await buildCategorySummary({
        ctx: this.ctx,
        period: fromPeriod,
        category,
        budget: fromBudget,
        date: fromPeriod.endDate,
        weekStart: settings.weekStart,
      });

      const carryover = computeCarryoverFromRemaining(fromBudget.rolloverRule, summary.remainingCents);
      const existingToBudget = await this.ctx.repos.budgets.getByPeriodAndCategory(toPeriodId, fromBudget.categoryId);

      const nextBudget: Budget = {
        id: existingToBudget?.id ?? this.ctx.uuid.next(),
        periodId: toPeriodId,
        categoryId: fromBudget.categoryId,
        cadence: existingToBudget?.cadence ?? fromBudget.cadence,
        amountCents: existingToBudget?.amountCents ?? fromBudget.amountCents,
        rolloverRule: existingToBudget?.rolloverRule ?? fromBudget.rolloverRule,
        carryoverCents: asMoney(carryover),
        createdAt: existingToBudget?.createdAt ?? this.ctx.clock.now(),
      };

      await this.ctx.repos.budgets.upsert(nextBudget);
    }
  }
}
