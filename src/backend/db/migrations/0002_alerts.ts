import type { Migration } from '../types';

export const migration0002Alerts: Migration = {
  id: 2,
  name: 'alerts_tables',
  upSql: `
CREATE TABLE IF NOT EXISTS alert_rules (
  category_id TEXT PRIMARY KEY,
  approaching_limit_percent INTEGER NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('approaching_limit', 'overspent')),
  threshold_percent INTEGER NOT NULL,
  triggered_at TEXT NOT NULL,
  dismissed_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (period_id) REFERENCES periods(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_period_category ON alerts(period_id, category_id);
CREATE INDEX IF NOT EXISTS idx_alerts_open ON alerts(dismissed_at);
`,
};
