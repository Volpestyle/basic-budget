import type { TimestampString } from '../../types/domain';
import type { DatabaseAdapter } from '../db/types';

type ImportBatch = {
  id: string;
  source: string;
  periodId: string | null;
  startedAt: TimestampString;
  finishedAt: TimestampString | null;
  importedCount: number;
  duplicatesCount: number;
  errorCount: number;
  notes: string | null;
};

export class ImportBatchesRepo {
  constructor(private readonly db: DatabaseAdapter) {}

  async insert(batch: ImportBatch): Promise<void> {
    await this.db.run(
      `
      INSERT INTO import_batches (
        id,
        source,
        period_id,
        started_at,
        finished_at,
        imported_count,
        duplicates_count,
        error_count,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        batch.id,
        batch.source,
        batch.periodId,
        batch.startedAt,
        batch.finishedAt,
        batch.importedCount,
        batch.duplicatesCount,
        batch.errorCount,
        batch.notes,
      ],
    );
  }

  async finish(
    batchId: string,
    input: {
      finishedAt: TimestampString;
      importedCount: number;
      duplicatesCount: number;
      errorCount: number;
      notes?: string;
    },
  ): Promise<void> {
    await this.db.run(
      `
      UPDATE import_batches
      SET
        finished_at = ?,
        imported_count = ?,
        duplicates_count = ?,
        error_count = ?,
        notes = ?
      WHERE id = ?
      `,
      [
        input.finishedAt,
        input.importedCount,
        input.duplicatesCount,
        input.errorCount,
        input.notes ?? null,
        batchId,
      ],
    );
  }
}
