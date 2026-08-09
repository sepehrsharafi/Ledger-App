import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { SCHEMA_SQL } from './schema.js';

const DB_PATH = process.env.LEDGER_DB_PATH
  ? resolve(process.env.LEDGER_DB_PATH)
  : resolve(process.cwd(), 'data', 'ledger.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(SCHEMA_SQL);

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

export function all<T extends Row = Row>(sql: string, ...params: SqlValue[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function get<T extends Row = Row>(sql: string, ...params: SqlValue[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: SqlValue[]): void {
  db.prepare(sql).run(...params);
}

/** Wraps a set of writes so a failed multi-table mutation never leaves partial state. */
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function isEmpty(): boolean {
  const row = get<{ count: number }>('SELECT COUNT(*) AS count FROM projects');
  return (row?.count ?? 0) === 0;
}

export { DB_PATH };
