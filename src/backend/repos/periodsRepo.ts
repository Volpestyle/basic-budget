import type { DateString, Period, TimestampString } from '../../types/domain';
import type { DatabaseAdapter } from '../db/types';
import { asDateString, asMoney, asTimestamp } from './shared';

type PeriodRow = {
  id: string;
  cycle_type: 'monthly' | 'biweekly';
  start_date: string;
  end_date: string;
  income_cents: number;
  created_at: string;
  closed_at: string | null;
};

const mapPeriod = (row: PeriodRow): Period => ({
  id: row.id,
  cycleType: row.cycle_type,
  startDate: asDateString(row.start_date),
  endDate: asDateString(row.end_date),
  incomeCents: asMoney(row.income_cents),
  createdAt: asTimestamp(row.created_at),
  closedAt: row.closed_at ? asTimestamp(row.closed_at) : null,
});

export class PeriodsRepo {
  constructor(private readonly db: DatabaseAdapter) {}

  async insert(period: Period): Promise<void> {
    await this.db.run(
      `
      INSERT INTO periods (
        id,
        cycle_type,
        start_date,
        end_date,
        income_cents,
        created_at,
        closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        period.id,
        period.cycleType,
        period.startDate,
        period.endDate,
        period.incomeCents,
        period.createdAt,
        period.closedAt,
      ],
    );
  }

  async getById(id: string): Promise<Period | null> {
    const row = await this.db.getFirst<PeriodRow>('SELECT * FROM periods WHERE id = ?', [id]);
    return row ? mapPeriod(row) : null;
  }

  async getCurrentByDate(date: DateString, cycleType?: 'monthly' | 'biweekly'): Promise<Period | null> {
    const params: unknown[] = [date, date];
    let sql = 'SELECT * FROM periods WHERE start_date <= ? AND end_date >= ?';
    if (cycleType) {
      sql += ' AND cycle_type = ?';
      params.push(cycleType);
    }
    sql += ' ORDER BY start_date DESC LIMIT 1';

    const row = await this.db.getFirst<PeriodRow>(sql, params);
    return row ? mapPeriod(row) : null;
  }

  async list(): Promise<Period[]> {
    const rows = await this.db.getAll<PeriodRow>('SELECT * FROM periods ORDER BY start_date DESC');
    return rows.map(mapPeriod);
  }

  async close(periodId: string, closedAt: TimestampString): Promise<void> {
    await this.db.run('UPDATE periods SET closed_at = ? WHERE id = ?', [closedAt, periodId]);
  }
}
