import type { Budget, Category, DateString, MoneyCents, Period, WeekDay } from '../../types/domain';
import type { BudgetSummary, CategorySummary } from '../../types/services';
import { calculateBudgetedPeriodCents } from '../domain/budgets';
import { computeLeftToSpend, getWeekDateRangeForTransactionScope } from '../domain/leftToSpend';
import { computePaceStatus } from '../domain/pace';
import { asMoney, subMoney } from '../domain/money';
import type { BackendContext } from './context';

const toMoney = (value: number): MoneyCents => asMoney(value);

export const buildCategorySummary = async (params: {
  ctx: BackendContext;
  period: Period;
  category: Category;
  budget: Budget;
  date: DateString;
  weekStart: WeekDay;
}): Promise<CategorySummary> => {
  const { ctx, period, category, budget, date, weekStart } = params;

  const budgetedPeriodCents = calculateBudgetedPeriodCents(
    budget.cadence,
    budget.amountCents,
    {
      startDate: period.startDate,
      endDate: period.endDate,
    },
    weekStart,
  );

  const spentCents = await ctx.repos.transactions.sumSpentInPeriod(period.id, category.id);
  const weekRange = getWeekDateRangeForTransactionScope(
    date,
    weekStart,
    period.startDate,
    period.endDate,
  );

  const spentWeekCents = weekRange
    ? await ctx.repos.transactions.sumSpentInDateRange({
        periodId: period.id,
        categoryId: category.id,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
      })
    : toMoney(0);

  const leftToSpend = computeLeftToSpend({
    cadence: budget.cadence,
    amountCents: budget.amountCents,
    carryoverCents: budget.carryoverCents,
    spentPeriodCents: spentCents,
    spentWeekCents,
    budgetedPeriodCents,
    periodStartDate: period.startDate,
    periodEndDate: period.endDate,
    date,
    weekStart,
  });

  const remainingCents = leftToSpend.remainingPeriodCents;
  const paceStatus = computePaceStatus({
    budgetedPeriodCents,
    remainingPeriodCents: remainingCents,
    periodStartDate: period.startDate,
    periodEndDate: period.endDate,
    date,
  });

  return {
    categoryId: category.id,
    category,
    budget,
    budgetedPeriodCents,
    spentCents,
    remainingCents,
    carryoverCents: budget.carryoverCents,
    leftToSpend,
    paceStatus,
  };
};

export const buildBudgetSummary = async (params: {
  ctx: BackendContext;
  period: Period;
  date: DateString;
  weekStart: WeekDay;
}): Promise<BudgetSummary> => {
  const { ctx, period, date, weekStart } = params;

  const [budgets, categories] = await Promise.all([
    ctx.repos.budgets.getByPeriod(period.id),
    ctx.repos.categories.list(true),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const categorySummaries = await Promise.all(
    budgets
      .map((budget) => {
        const category = categoryMap.get(budget.categoryId);
        if (!category) {
          return null;
        }
        return buildCategorySummary({
          ctx,
          period,
          category,
          budget,
          date,
          weekStart,
        });
      })
      .filter((x): x is Promise<CategorySummary> => Boolean(x)),
  );

  const totalAllocatedCents = toMoney(
    categorySummaries.reduce((sum, summary) => sum + summary.budgetedPeriodCents, 0),
  );
  const totalSpentCents = toMoney(categorySummaries.reduce((sum, summary) => sum + summary.spentCents, 0));
  const totalRemainingCents = toMoney(
    categorySummaries.reduce((sum, summary) => sum + summary.remainingCents, 0),
  );

  const unallocatedCents = subMoney(period.incomeCents, totalAllocatedCents);

  return {
    periodId: period.id,
    period,
    totalIncomeCents: period.incomeCents,
    totalAllocatedCents,
    totalSpentCents,
    totalRemainingCents,
    unallocatedCents,
    categories: categorySummaries,
  };
};
