import Database from 'better-sqlite3';

import type { DatabaseAdapter, DatabaseRunResult } from '../db/types';

type BetterSqliteDb = InstanceType<typeof Database>;

const toParams = (params?: unknown[]): unknown[] => params ?? [];

export interface SqliteTestContext {
  db: BetterSqliteDb;
  adapter: DatabaseAdapter;
  close: () => void;
}

export const createSqliteTestContext = (): SqliteTestContext => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  const adapter: DatabaseAdapter = {
    exec: async (sql: string): Promise<void> => {
      db.exec(sql);
    },
    run: async (sql: string, params?: unknown[]): Promise<DatabaseRunResult> => {
      const statement = db.prepare(sql);
      const info = statement.run(...toParams(params));
      return {
        changes: info.changes,
        lastInsertRowId: Number(info.lastInsertRowid),
      };
    },
    getFirst: async <T>(sql: string, params?: unknown[]): Promise<T | null> => {
      const statement = db.prepare(sql);
      const row = statement.get(...toParams(params));
      return (row as T | undefined) ?? null;
    },
    getAll: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const statement = db.prepare(sql);
      const rows = statement.all(...toParams(params));
      return rows as T[];
    },
    withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
      db.exec('BEGIN TRANSACTION');
      try {
        const result = await fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return {
    db,
    adapter,
    close: () => db.close(),
  };
};
