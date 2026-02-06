export interface DatabaseRunResult {
  changes: number;
  lastInsertRowId?: number;
}

export interface DatabaseAdapter {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<DatabaseRunResult>;
  getFirst<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface Migration {
  id: number;
  name: string;
  upSql: string;
}
