import type { DateString, PaceStatus, WeekDay } from '../../types/domain';
import type { CalculationService, LeftToSpend } from '../../types/services';
import type { BackendContext } from './context';
import { requireValue } from './internal';
import { buildCategorySummary } from './summary';

export class CalculationServiceImpl implements CalculationService {
  constructor(private readonly ctx: BackendContext) {}

  async computeLeftToSpend(
    periodId: string,
    categoryId: string,
    date: DateString,
    weekStart: WeekDay,
  ): Promise<LeftToSpend> {
    const [period, category, budget] = await Promise.all([
      this.ctx.repos.periods.getById(periodId),
      this.ctx.repos.categories.getById(categoryId),
      this.ctx.repos.budgets.getByPeriodAndCategory(periodId, categoryId),
    ]);

    const summary = await buildCategorySummary({
      ctx: this.ctx,
      period: requireValue(period, `Period not found: ${periodId}`),
      category: requireValue(category, `Category not found: ${categoryId}`),
      budget: requireValue(budget, `Budget not found for category ${categoryId} in period ${periodId}`),
      date,
      weekStart,
    });

    return summary.leftToSpend;
  }

  async computePaceStatus(periodId: string, categoryId: string, date: DateString): Promise<PaceStatus> {
    const settings = await this.ctx.repos.settings.get();
    const [period, category, budget] = await Promise.all([
      this.ctx.repos.periods.getById(periodId),
      this.ctx.repos.categories.getById(categoryId),
      this.ctx.repos.budgets.getByPeriodAndCategory(periodId, categoryId),
    ]);

    const summary = await buildCategorySummary({
      ctx: this.ctx,
      period: requireValue(period, `Period not found: ${periodId}`),
      category: requireValue(category, `Category not found: ${categoryId}`),
      budget: requireValue(budget, `Budget not found for category ${categoryId} in period ${periodId}`),
      date,
      weekStart: settings.weekStart,
    });

    return summary.paceStatus;
  }
}
