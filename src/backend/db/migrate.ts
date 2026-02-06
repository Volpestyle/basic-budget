import { PersistenceError } from '../infra/errors';
import { MIGRATIONS } from './migrations';
import type { DatabaseAdapter, Migration } from './types';

type MigrationRow = {
  id: number;
};

const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`;

const getAppliedMigrationIds = async (db: DatabaseAdapter): Promise<Set<number>> => {
  const rows = await db.getAll<MigrationRow>('SELECT id FROM schema_migrations ORDER BY id ASC');
  return new Set(rows.map((row) => row.id));
};

const applyMigration = async (db: DatabaseAdapter, migration: Migration): Promise<void> => {
  const appliedAt = new Date().toISOString();
  await db.withTransaction(async () => {
    await db.exec(migration.upSql);
    await db.run('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)', [
      migration.id,
      migration.name,
      appliedAt,
    ]);
  });
};

export const runMigrations = async (db: DatabaseAdapter): Promise<void> => {
  try {
    await db.exec(MIGRATION_TABLE_SQL);
    const applied = await getAppliedMigrationIds(db);
    const ordered = [...MIGRATIONS].sort((a, b) => a.id - b.id);

    for (const migration of ordered) {
      if (applied.has(migration.id)) {
        continue;
      }
      await applyMigration(db, migration);
    }
  } catch (error) {
    throw new PersistenceError('Failed running DB migrations', error);
  }
};
