import type { Alert, AlertRule, TimestampString } from '../../types/domain';
import type { DatabaseAdapter } from '../db/types';
import { asTimestamp, boolToSqliteInt, sqliteIntToBool } from './shared';

type AlertRuleRow = {
  category_id: string;
  approaching_limit_percent: number;
  enabled: number;
};

type AlertRow = {
  id: string;
  category_id: string;
  period_id: string;
  type: 'approaching_limit' | 'overspent';
  threshold_percent: number;
  triggered_at: string;
  dismissed_at: string | null;
};

const mapAlertRule = (row: AlertRuleRow): AlertRule => ({
  categoryId: row.category_id,
  approachingLimitPercent: row.approaching_limit_percent,
  enabled: sqliteIntToBool(row.enabled),
});

const mapAlert = (row: AlertRow): Alert => ({
  id: row.id,
  categoryId: row.category_id,
  periodId: row.period_id,
  type: row.type,
  thresholdPercent: row.threshold_percent,
  triggeredAt: asTimestamp(row.triggered_at),
  dismissedAt: row.dismissed_at ? asTimestamp(row.dismissed_at) : null,
});

export class AlertsRepo {
  constructor(private readonly db: DatabaseAdapter) {}

  async getRule(categoryId: string): Promise<AlertRule> {
    const row = await this.db.getFirst<AlertRuleRow>('SELECT * FROM alert_rules WHERE category_id = ?', [categoryId]);
    if (!row) {
      return {
        categoryId,
        approachingLimitPercent: 80,
        enabled: true,
      };
    }

    return mapAlertRule(row);
  }

  async setRule(rule: AlertRule): Promise<void> {
    await this.db.run(
      `
      INSERT INTO alert_rules (category_id, approaching_limit_percent, enabled)
      VALUES (?, ?, ?)
      ON CONFLICT(category_id)
      DO UPDATE SET
        approaching_limit_percent = excluded.approaching_limit_percent,
        enabled = excluded.enabled
      `,
      [rule.categoryId, rule.approachingLimitPercent, boolToSqliteInt(rule.enabled)],
    );
  }

  async insert(alert: Alert): Promise<void> {
    await this.db.run(
      `
      INSERT INTO alerts (
        id,
        category_id,
        period_id,
        type,
        threshold_percent,
        triggered_at,
        dismissed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        alert.id,
        alert.categoryId,
        alert.periodId,
        alert.type,
        alert.thresholdPercent,
        alert.triggeredAt,
        alert.dismissedAt,
      ],
    );
  }

  async listByPeriod(periodId: string): Promise<Alert[]> {
    const rows = await this.db.getAll<AlertRow>(
      'SELECT * FROM alerts WHERE period_id = ? ORDER BY triggered_at DESC',
      [periodId],
    );
    return rows.map(mapAlert);
  }

  async listOpenByPeriodAndCategory(periodId: string, categoryId: string): Promise<Alert[]> {
    const rows = await this.db.getAll<AlertRow>(
      'SELECT * FROM alerts WHERE period_id = ? AND category_id = ? AND dismissed_at IS NULL',
      [periodId, categoryId],
    );
    return rows.map(mapAlert);
  }

  async dismiss(alertId: string, dismissedAt: TimestampString): Promise<void> {
    await this.db.run('UPDATE alerts SET dismissed_at = ? WHERE id = ?', [dismissedAt, alertId]);
  }
}
