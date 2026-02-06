import type { Budget } from '../../types/domain';
import type { DatabaseAdapter } from '../db/types';
import { asMoney, asTimestamp } from './shared';

type BudgetRow = {
  id: string;
  period_id: string;
  category_id: string;
  cadence: 'monthly' | 'weekly';
  amount_cents: number;
  rollover_rule: 'reset' | 'pos' | 'pos_neg';
  carryover_cents: number;
  created_at: string;
};

const mapBudget = (row: BudgetRow): Budget => ({
  id: row.id,
  periodId: row.period_id,
  categoryId: row.category_id,
  cadence: row.cadence,
  amountCents: asMoney(row.amount_cents),
  rolloverRule: row.rollover_rule,
  carryoverCents: asMoney(row.carryover_cents),
  createdAt: asTimestamp(row.created_at),
});

export class BudgetsRepo {
  constructor(private readonly db: DatabaseAdapter) {}

  async upsert(budget: Budget): Promise<void> {
    await this.db.run(
      `
      INSERT INTO budgets (
        id,
        period_id,
        category_id,
        cadence,
        amount_cents,
        rollover_rule,
        carryover_cents,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(period_id, category_id)
      DO UPDATE SET
        cadence = excluded.cadence,
        amount_cents = excluded.amount_cents,
        rollover_rule = excluded.rollover_rule,
        carryover_cents = excluded.carryover_cents
      `,
      [
        budget.id,
        budget.periodId,
        budget.categoryId,
        budget.cadence,
        budget.amountCents,
        budget.rolloverRule,
        budget.carryoverCents,
        budget.createdAt,
      ],
    );
  }

  async getById(id: string): Promise<Budget | null> {
    const row = await this.db.getFirst<BudgetRow>('SELECT * FROM budgets WHERE id = ?', [id]);
    return row ? mapBudget(row) : null;
  }

  async getByPeriod(periodId: string): Promise<Budget[]> {
    const rows = await this.db.getAll<BudgetRow>('SELECT * FROM budgets WHERE period_id = ?', [periodId]);
    return rows.map(mapBudget);
  }

  async getByPeriodAndCategory(periodId: string, categoryId: string): Promise<Budget | null> {
    const row = await this.db.getFirst<BudgetRow>(
      'SELECT * FROM budgets WHERE period_id = ? AND category_id = ?',
      [periodId, categoryId],
    );
    return row ? mapBudget(row) : null;
  }
}
