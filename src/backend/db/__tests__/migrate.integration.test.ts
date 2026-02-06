/** @jest-environment node */
/// <reference types="jest" />

import { runMigrations } from '../migrate';
import { createSqliteTestContext } from '../../test/sqliteTestAdapter';

type CountRow = { count: number };
type MigrationRow = { id: number; name: string };
type NameRow = { name: string };

describe('database migrations integration', () => {
  it('applies all migrations and remains idempotent', async () => {
    const { db, adapter, close } = createSqliteTestContext();

    try {
      await runMigrations(adapter);

      const migrationRows = db.prepare('SELECT id, name FROM schema_migrations ORDER BY id').all() as MigrationRow[];
      expect(migrationRows.map((row) => row.id)).toEqual([1, 2, 3]);

      const tableNames = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as NameRow[]).map(
        (row) => row.name,
      );

      expect(tableNames).toEqual(
        expect.arrayContaining([
          'schema_migrations',
          'periods',
          'categories',
          'budgets',
          'transactions',
          'settings',
          'alert_rules',
          'alerts',
          'import_batches',
        ]),
      );

      await runMigrations(adapter);

      const countRow = db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get() as CountRow;
      expect(countRow.count).toBe(3);
    } finally {
      close();
    }
  });
});
