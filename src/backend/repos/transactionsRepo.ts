import type { DateString, MoneyCents, Transaction } from '../../types/domain';
import type { TransactionFilter } from '../../types/services';
import type { DatabaseAdapter } from '../db/types';
import { asDateString, asMoney, asTimestamp } from './shared';

type TransactionRow = {
  id: string;
  date: string;
  amount_cents: number;
  category_id: string;
  period_id: string;
  merchant: string | null;
  note: string | null;
  source: 'manual' | 'import';
  external_id: string | null;
  status: 'posted' | 'pending';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const mapTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  date: asDateString(row.date),
  amountCents: asMoney(row.amount_cents),
  categoryId: row.category_id,
  periodId: row.period_id,
  merchant: row.merchant,
  note: row.note,
  source: row.source,
  externalId: row.external_id,
  status: row.status,
  createdAt: asTimestamp(row.created_at),
  updatedAt: asTimestamp(row.updated_at),
  deletedAt: row.deleted_at ? asTimestamp(row.deleted_at) : null,
});

type SumRow = {
  value: number | null;
};

const SPEND_SUM_BASE =
  'SELECT COALESCE(-SUM(amount_cents), 0) AS value FROM transactions WHERE amount_cents < 0 AND deleted_at IS NULL';

export class TransactionsRepo {
  constructor(private readonly db: DatabaseAdapter) {}

  async insert(tx: Transaction): Promise<void> {
    await this.db.run(
      `
      INSERT INTO transactions (
        id,
        date,
        amount_cents,
        category_id,
        period_id,
        merchant,
        note,
        source,
        external_id,
        status,
        created_at,
        updated_at,
        deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tx.id,
        tx.date,
        tx.amountCents,
        tx.categoryId,
        tx.periodId,
        tx.merchant,
        tx.note,
        tx.source,
        tx.externalId,
        tx.status,
        tx.createdAt,
        tx.updatedAt,
        tx.deletedAt,
      ],
    );
  }

  async update(tx: Transaction): Promise<void> {
    await this.db.run(
      `
      UPDATE transactions
      SET
        date = ?,
        amount_cents = ?,
        category_id = ?,
        merchant = ?,
        note = ?,
        status = ?,
        updated_at = ?,
        deleted_at = ?
      WHERE id = ?
      `,
      [
        tx.date,
        tx.amountCents,
        tx.categoryId,
        tx.merchant,
        tx.note,
        tx.status,
        tx.updatedAt,
        tx.deletedAt,
        tx.id,
      ],
    );
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.run('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', [deletedAt, deletedAt, id]);
  }

  async getById(id: string): Promise<Transaction | null> {
    const row = await this.db.getFirst<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [id]);
    return row ? mapTransaction(row) : null;
  }

  async list(filter: TransactionFilter): Promise<Transaction[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    if (filter.periodId) {
      conditions.push('period_id = ?');
      params.push(filter.periodId);
    }
    if (filter.categoryId) {
      conditions.push('category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.startDate) {
      conditions.push('date >= ?');
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push('date <= ?');
      params.push(filter.endDate);
    }
    if (filter.source) {
      conditions.push('source = ?');
      params.push(filter.source);
    }
    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    const sql = `
      SELECT *
      FROM transactions
      WHERE ${conditions.join(' AND ')}
      ORDER BY date DESC, created_at DESC
    `;

    const rows = await this.db.getAll<TransactionRow>(sql, params);
    return rows.map(mapTransaction);
  }

  async sumSpentInPeriod(periodId: string, categoryId?: string): Promise<MoneyCents> {
    const conditions = ['period_id = ?'];
    const params: unknown[] = [periodId];

    if (categoryId) {
      conditions.push('category_id = ?');
      params.push(categoryId);
    }

    const row = await this.db.getFirst<SumRow>(`${SPEND_SUM_BASE} AND ${conditions.join(' AND ')}`, params);
    return asMoney(row?.value ?? 0);
  }

  async sumSpentInDateRange(params: {
    periodId: string;
    categoryId: string;
    startDate: DateString;
    endDate: DateString;
  }): Promise<MoneyCents> {
    const row = await this.db.getFirst<SumRow>(
      `${SPEND_SUM_BASE} AND period_id = ? AND category_id = ? AND date >= ? AND date <= ?`,
      [params.periodId, params.categoryId, params.startDate, params.endDate],
    );

    return asMoney(row?.value ?? 0);
  }
}
