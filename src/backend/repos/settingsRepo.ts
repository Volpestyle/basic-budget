import type { Settings } from '../../types/domain';
import type { DatabaseAdapter } from '../db/types';
import { ValidationError } from '../infra/errors';
import { asDateString, asWeekDay, boolToSqliteInt, sqliteIntToBool } from './shared';

type SettingsRow = {
  id: number;
  cycle_type: 'monthly' | 'biweekly';
  week_start: number;
  currency: string;
  locale: string;
  biweekly_anchor_date: string | null;
  app_lock_enabled: number;
};

const mapSettings = (row: SettingsRow): Settings => ({
  cycleType: row.cycle_type,
  weekStart: asWeekDay(row.week_start),
  currency: row.currency,
  locale: row.locale,
  biweeklyAnchorDate: row.biweekly_anchor_date ? asDateString(row.biweekly_anchor_date) : null,
  appLockEnabled: sqliteIntToBool(row.app_lock_enabled),
});

export class SettingsRepo {
  constructor(private readonly db: DatabaseAdapter) {}

  async get(): Promise<Settings> {
    const row = await this.db.getFirst<SettingsRow>('SELECT * FROM settings WHERE id = 1');
    if (!row) {
      throw new ValidationError('Settings row is missing');
    }
    return mapSettings(row);
  }

  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const next: Settings = {
      ...current,
      ...patch,
    };

    await this.db.run(
      `
      UPDATE settings
      SET
        cycle_type = ?,
        week_start = ?,
        currency = ?,
        locale = ?,
        biweekly_anchor_date = ?,
        app_lock_enabled = ?
      WHERE id = 1
      `,
      [
        next.cycleType,
        next.weekStart,
        next.currency,
        next.locale,
        next.biweeklyAnchorDate,
        boolToSqliteInt(next.appLockEnabled),
      ],
    );

    return next;
  }
}
