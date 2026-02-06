import type { MoneyCents, Transaction } from '../../types/domain';
import type { CSVImportResult, CSVService } from '../../types/services';
import { asMoney } from '../domain/money';
import type { BackendContext } from './context';
import { requireValue } from './internal';

type CsvRecord = Record<string, string>;

const CSV_HEADERS = [
  'id',
  'date',
  'amount_cents',
  'category_id',
  'period_id',
  'merchant',
  'note',
  'source',
  'external_id',
  'status',
  'created_at',
  'updated_at',
  'deleted_at',
];

const escapeCsvValue = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result.map((value) => value.trim());
};

const parseCsv = (content: string): CsvRecord[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headerLine = lines[0];
  if (!headerLine) {
    return [];
  }

  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: CsvRecord = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
};

const parseAmountCents = (raw: string): MoneyCents => {
  if (!raw) {
    return asMoney(0);
  }

  if (/^-?\d+$/.test(raw)) {
    return asMoney(Number(raw));
  }

  const asFloat = Number(raw.replace(/[$,]/g, ''));
  if (!Number.isFinite(asFloat)) {
    return asMoney(0);
  }
  return asMoney(Math.round(asFloat * 100));
};

const fuzzyKey = (tx: Pick<Transaction, 'date' | 'amountCents' | 'merchant'>): string =>
  `${tx.date}|${tx.amountCents}|${(tx.merchant ?? '').trim().toLowerCase()}`;

const normalizeForCsv = (value: string | number | null): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

export class CsvServiceImpl implements CSVService {
  constructor(private readonly ctx: BackendContext) {}

  async exportTransactions(periodId?: string): Promise<string> {
    const transactions = await this.ctx.repos.transactions.list({ periodId });
    const rows = transactions.map((tx) =>
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
      ]
        .map((value) => escapeCsvValue(normalizeForCsv(value)))
        .join(','),
    );

    return `${CSV_HEADERS.join(',')}\n${rows.join('\n')}`.trimEnd();
  }

  async exportBudgetSnapshot(periodId: string): Promise<string> {
    const period = requireValue(await this.ctx.repos.periods.getById(periodId), `Period not found: ${periodId}`);
    const [budgets, categories] = await Promise.all([
      this.ctx.repos.budgets.getByPeriod(periodId),
      this.ctx.repos.categories.list(true),
    ]);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const headers = [
      'period_id',
      'period_start_date',
      'period_end_date',
      'category_id',
      'category_name',
      'cadence',
      'amount_cents',
      'rollover_rule',
      'carryover_cents',
    ];

    const rows = budgets.map((budget) => {
      const category = categoryMap.get(budget.categoryId);
      return [
        period.id,
        period.startDate,
        period.endDate,
        budget.categoryId,
        category?.name ?? '',
        budget.cadence,
        budget.amountCents,
        budget.rolloverRule,
        budget.carryoverCents,
      ]
        .map((value) => escapeCsvValue(normalizeForCsv(value)))
        .join(',');
    });

    return `${headers.join(',')}\n${rows.join('\n')}`.trimEnd();
  }

  async importTransactions(csvContent: string, periodId: string): Promise<CSVImportResult> {
    const period = requireValue(await this.ctx.repos.periods.getById(periodId), `Period not found: ${periodId}`);
    const records = parseCsv(csvContent);

    const existingTransactions = await this.ctx.repos.transactions.list({ periodId });
    const existingByExternalId = new Set(existingTransactions.map((tx) => tx.externalId).filter(Boolean));
    const existingFuzzy = new Set(existingTransactions.map((tx) => fuzzyKey(tx)));

    const categories = await this.ctx.repos.categories.list(true);
    const categoriesByName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category.id]));

    const errors: string[] = [];
    let imported = 0;
    let duplicatesSkipped = 0;

    const batchId = this.ctx.uuid.next();
    const startedAt = this.ctx.clock.now();

    await this.ctx.repos.importBatches.insert({
      id: batchId,
      source: 'csv',
      periodId,
      startedAt,
      finishedAt: null,
      importedCount: 0,
      duplicatesCount: 0,
      errorCount: 0,
      notes: null,
    });

    for (const [index, record] of records.entries()) {
      const rowNum = index + 2;

      try {
        const date = (record.date || '').trim();
        const amountRaw = (record.amount_cents || record.amount || '').trim();
        const merchant = (record.merchant || '').trim() || null;
        const note = (record.note || '').trim() || null;
        const externalId = (record.external_id || '').trim() || null;
        const status = ((record.status || 'posted').trim() || 'posted') as 'posted' | 'pending';

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error('Invalid or missing date (expected YYYY-MM-DD)');
        }

        const amountCents = parseAmountCents(amountRaw);
        if (amountCents === 0) {
          throw new Error('Invalid or zero amount');
        }

        let categoryId = (record.category_id || record.categoryid || '').trim();
        if (!categoryId) {
          const categoryName = (record.category_name || record.category || '').trim().toLowerCase();
          categoryId = categoryName ? categoriesByName.get(categoryName) ?? '' : '';
        }
        if (!categoryId) {
          throw new Error('Missing category_id or category_name mapping');
        }

        const duplicateByExternalId = externalId ? existingByExternalId.has(externalId) : false;
        const fKey = fuzzyKey({ date: date as Transaction['date'], amountCents, merchant });
        const duplicateByFuzzy = existingFuzzy.has(fKey);

        if (duplicateByExternalId || duplicateByFuzzy) {
          duplicatesSkipped += 1;
          continue;
        }

        const now = this.ctx.clock.now();
        const tx: Transaction = {
          id: this.ctx.uuid.next(),
          date: date as Transaction['date'],
          amountCents,
          categoryId,
          periodId: period.id,
          merchant,
          note,
          source: 'import',
          externalId,
          status,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };

        await this.ctx.repos.transactions.insert(tx);

        if (externalId) {
          existingByExternalId.add(externalId);
        }
        existingFuzzy.add(fKey);
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown import error';
        errors.push(`row ${rowNum}: ${message}`);
      }
    }

    await this.ctx.repos.importBatches.finish(batchId, {
      finishedAt: this.ctx.clock.now(),
      importedCount: imported,
      duplicatesCount: duplicatesSkipped,
      errorCount: errors.length,
    });

    return {
      imported,
      duplicatesSkipped,
      errors,
    };
  }
}
