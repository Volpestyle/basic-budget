import type { Alert, AlertRule, AlertType, DateString } from '../../types/domain';
import type { AlertService } from '../../types/services';
import { buildCategorySummary } from './summary';
import type { BackendContext } from './context';
import { requireValue } from './internal';

const shouldCreateApproachingAlert = (spentCents: number, budgetedCents: number, thresholdPercent: number): boolean => {
  if (budgetedCents <= 0) {
    return false;
  }
  const percent = (spentCents / budgetedCents) * 100;
  return percent >= thresholdPercent;
};

const hasOpenAlertType = (alerts: Alert[], type: AlertType): boolean => alerts.some((alert) => alert.type === type && !alert.dismissedAt);

export class AlertServiceImpl implements AlertService {
  constructor(private readonly ctx: BackendContext) {}

  async evaluateAlerts(periodId: string, date: DateString): Promise<Alert[]> {
    const [period, settings, budgets] = await Promise.all([
      this.ctx.repos.periods.getById(periodId),
      this.ctx.repos.settings.get(),
      this.ctx.repos.budgets.getByPeriod(periodId),
    ]);

    const existingPeriodAlerts = await this.ctx.repos.alerts.listByPeriod(periodId);
    const periodValue = requireValue(period, `Period not found: ${periodId}`);

    for (const budget of budgets) {
      const category = await this.ctx.repos.categories.getById(budget.categoryId);
      if (!category || category.archivedAt) {
        continue;
      }

      const rule = await this.ctx.repos.alerts.getRule(category.id);
      if (!rule.enabled) {
        continue;
      }

      const summary = await buildCategorySummary({
        ctx: this.ctx,
        period: periodValue,
        category,
        budget,
        date,
        weekStart: settings.weekStart,
      });

      const openAlertsForCategory = existingPeriodAlerts.filter(
        (alert) => alert.categoryId === category.id && alert.dismissedAt === null,
      );

      if (summary.leftToSpend.isOverspent) {
        if (!hasOpenAlertType(openAlertsForCategory, 'overspent')) {
          const alert: Alert = {
            id: this.ctx.uuid.next(),
            categoryId: category.id,
            periodId,
            type: 'overspent',
            thresholdPercent: 100,
            triggeredAt: this.ctx.clock.now(),
            dismissedAt: null,
          };
          await this.ctx.repos.alerts.insert(alert);
          existingPeriodAlerts.unshift(alert);
        }
        continue;
      }

      if (
        shouldCreateApproachingAlert(
          summary.spentCents,
          summary.budgetedPeriodCents,
          rule.approachingLimitPercent,
        ) && !hasOpenAlertType(openAlertsForCategory, 'approaching_limit')
      ) {
        const alert: Alert = {
          id: this.ctx.uuid.next(),
          categoryId: category.id,
          periodId,
          type: 'approaching_limit',
          thresholdPercent: rule.approachingLimitPercent,
          triggeredAt: this.ctx.clock.now(),
          dismissedAt: null,
        };

        await this.ctx.repos.alerts.insert(alert);
        existingPeriodAlerts.unshift(alert);
      }
    }

    return this.ctx.repos.alerts.listByPeriod(periodId);
  }

  async dismissAlert(alertId: string): Promise<void> {
    await this.ctx.repos.alerts.dismiss(alertId, this.ctx.clock.now());
  }

  async getAlertRules(categoryId: string): Promise<AlertRule> {
    return this.ctx.repos.alerts.getRule(categoryId);
  }

  async setAlertRule(rule: AlertRule): Promise<void> {
    await this.ctx.repos.alerts.setRule(rule);
  }
}
