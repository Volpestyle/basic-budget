import type { Migration } from '../types';

export const migration0003ImportMeta: Migration = {
  id: 3,
  name: 'import_metadata',
  upSql: `
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  period_id TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  imported_count INTEGER NOT NULL DEFAULT 0,
  duplicates_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (period_id) REFERENCES periods(id)
);

CREATE INDEX IF NOT EXISTS idx_import_batches_period ON import_batches(period_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_started ON import_batches(started_at);
`,
};
