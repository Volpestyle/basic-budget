import type { Migration } from '../types';

export const migration0001Init: Migration = {
  id: 1,
  name: 'init_core_tables',
  upSql: `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS periods (
  id TEXT PRIMARY KEY,
  cycle_type TEXT NOT NULL CHECK (cycle_type IN ('monthly', 'biweekly')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  income_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_periods_date_window ON periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_periods_cycle_type ON periods(cycle_type);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('need', 'want')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'weekly')),
  amount_cents INTEGER NOT NULL,
  rollover_rule TEXT NOT NULL CHECK (rollover_rule IN ('reset', 'pos', 'pos_neg')),
  carryover_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  UNIQUE (period_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_period_id ON budgets(period_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  merchant TEXT,
  note TEXT,
  source TEXT NOT NULL CHECK (source IN ('manual', 'import')),
  external_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('posted', 'pending')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_id_unique
  ON transactions(external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_period_date ON transactions(period_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_period_category_date ON transactions(period_id, category_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_not_deleted ON transactions(deleted_at);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cycle_type TEXT NOT NULL CHECK (cycle_type IN ('monthly', 'biweekly')),
  week_start INTEGER NOT NULL CHECK (week_start >= 0 AND week_start <= 6),
  currency TEXT NOT NULL,
  locale TEXT NOT NULL,
  biweekly_anchor_date TEXT,
  app_lock_enabled INTEGER NOT NULL CHECK (app_lock_enabled IN (0, 1))
);

INSERT OR IGNORE INTO settings (
  id,
  cycle_type,
  week_start,
  currency,
  locale,
  biweekly_anchor_date,
  app_lock_enabled
)
VALUES (1, 'monthly', 1, 'USD', 'en-US', NULL, 0);
`,
};
