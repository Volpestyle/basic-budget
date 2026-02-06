import { PersistenceError } from '../infra/errors';
import type { DatabaseAdapter, DatabaseRunResult } from './types';

type SqliteDbLike = {
  execAsync?: (sql: string) => Promise<void>;
  runAsync?: (sql: string, params?: unknown[]) => Promise<{ changes?: number; lastInsertRowId?: number }>;
  getFirstAsync?: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
  getAllAsync?: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  withTransactionAsync?: <T>(fn: () => Promise<T>) => Promise<T>;

  execSync?: (sql: string) => void;
  runSync?: (sql: string, params?: unknown[]) => { changes?: number; lastInsertRowId?: number };
  getFirstSync?: <T>(sql: string, params?: unknown[]) => T | null;
  getAllSync?: <T>(sql: string, params?: unknown[]) => T[];
  withTransactionSync?: <T>(fn: () => T) => T;
};

const normalizeRunResult = (result: { changes?: number; lastInsertRowId?: number } | undefined): DatabaseRunResult => ({
  changes: result?.changes ?? 0,
  lastInsertRowId: result?.lastInsertRowId,
});

const ensure = <T>(value: T | undefined, methodName: string): T => {
  if (value === undefined) {
    throw new PersistenceError(`SQLite adapter missing method: ${methodName}`);
  }
  return value;
};

export const createDatabaseAdapterFromRaw = (db: SqliteDbLike): DatabaseAdapter => {
  const exec = async (sql: string): Promise<void> => {
    if (db.execAsync) {
      await db.execAsync(sql);
      return;
    }
    const execSync = ensure(db.execSync, 'execSync');
    execSync.call(db, sql);
  };

  const run = async (sql: string, params: unknown[] = []): Promise<DatabaseRunResult> => {
    if (db.runAsync) {
      const result = await db.runAsync(sql, params);
      return normalizeRunResult(result);
    }
    const runSync = ensure(db.runSync, 'runSync');
    const result = runSync.call(db, sql, params);
    return normalizeRunResult(result);
  };

  const getFirst = async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
    if (db.getFirstAsync) {
      return db.getFirstAsync<T>(sql, params);
    }
    const getFirstSync = ensure(db.getFirstSync, 'getFirstSync');
    return getFirstSync.call(db, sql, params) as T | null;
  };

  const getAll = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
    if (db.getAllAsync) {
      return db.getAllAsync<T>(sql, params);
    }
    const getAllSync = ensure(db.getAllSync, 'getAllSync');
    return getAllSync.call(db, sql, params) as T[];
  };

  const withTransaction = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (db.withTransactionAsync) {
      return db.withTransactionAsync(fn);
    }
    if (db.withTransactionSync) {
      const result = db.withTransactionSync(() => fn());
      return await result;
    }

    await exec('BEGIN TRANSACTION');
    try {
      const result = await fn();
      await exec('COMMIT');
      return result;
    } catch (error) {
      await exec('ROLLBACK');
      throw error;
    }
  };

  return { exec, run, getFirst, getAll, withTransaction };
};

export const openExpoDatabase = async (dbName = 'basic-budget.db'): Promise<DatabaseAdapter> => {
  try {
    const sqlite = await import('expo-sqlite');
    const openAsync = (sqlite as { openDatabaseAsync?: (name: string) => Promise<SqliteDbLike> }).openDatabaseAsync;
    if (openAsync) {
      const db = await openAsync(dbName);
      return createDatabaseAdapterFromRaw(db);
    }

    const openSync = (sqlite as { openDatabaseSync?: (name: string) => SqliteDbLike }).openDatabaseSync;
    if (!openSync) {
      throw new PersistenceError('expo-sqlite does not expose openDatabaseAsync/openDatabaseSync');
    }

    const db = openSync(dbName);
    return createDatabaseAdapterFromRaw(db);
  } catch (error) {
    throw new PersistenceError('Failed to initialize SQLite database', error);
  }
};
