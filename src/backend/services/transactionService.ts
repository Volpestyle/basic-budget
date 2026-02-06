import type { Transaction } from '../../types/domain';
import type {
  CreateTransactionInput,
  TransactionFilter,
  TransactionService,
  UpdateTransactionInput,
} from '../../types/services';
import type { BackendContext } from './context';
import { assert, requireValue } from './internal';

export class TransactionServiceImpl implements TransactionService {
  constructor(private readonly ctx: BackendContext) {}

  async addTransaction(input: CreateTransactionInput): Promise<Transaction> {
    assert(Boolean(input.periodId), 'periodId is required');
    assert(Boolean(input.categoryId), 'categoryId is required');

    requireValue(await this.ctx.repos.periods.getById(input.periodId), `Period not found: ${input.periodId}`);
    requireValue(await this.ctx.repos.categories.getById(input.categoryId), `Category not found: ${input.categoryId}`);

    const now = this.ctx.clock.now();

    const tx: Transaction = {
      id: this.ctx.uuid.next(),
      date: input.date,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      periodId: input.periodId,
      merchant: input.merchant ?? null,
      note: input.note ?? null,
      source: input.source ?? 'manual',
      externalId: null,
      status: 'posted',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await this.ctx.repos.transactions.insert(tx);
    return tx;
  }

  async updateTransaction(id: string, patch: UpdateTransactionInput): Promise<Transaction> {
    const existing = requireValue(await this.ctx.repos.transactions.getById(id), `Transaction not found: ${id}`);

    if (patch.categoryId) {
      requireValue(await this.ctx.repos.categories.getById(patch.categoryId), `Category not found: ${patch.categoryId}`);
    }

    const updated: Transaction = {
      ...existing,
      date: patch.date ?? existing.date,
      amountCents: patch.amountCents ?? existing.amountCents,
      categoryId: patch.categoryId ?? existing.categoryId,
      merchant: patch.merchant === undefined ? existing.merchant : patch.merchant,
      note: patch.note === undefined ? existing.note : patch.note,
      updatedAt: this.ctx.clock.now(),
    };

    await this.ctx.repos.transactions.update(updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    requireValue(await this.ctx.repos.transactions.getById(id), `Transaction not found: ${id}`);
    await this.ctx.repos.transactions.softDelete(id, this.ctx.clock.now());
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.ctx.repos.transactions.getById(id);
  }

  async listTransactions(filter: TransactionFilter): Promise<Transaction[]> {
    return this.ctx.repos.transactions.list(filter);
  }
}
