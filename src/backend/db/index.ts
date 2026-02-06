import { openExpoDatabase } from './client';
import { runMigrations } from './migrate';
import type { DatabaseAdapter } from './types';

let dbPromise: Promise<DatabaseAdapter> | null = null;

export const initDatabase = async (dbName = 'basic-budget.db'): Promise<DatabaseAdapter> => {
  const db = await openExpoDatabase(dbName);
  await runMigrations(db);
  return db;
};

export const getDatabase = async (): Promise<DatabaseAdapter> => {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
};

export const resetDatabaseHandleForTests = (): void => {
  dbPromise = null;
};
