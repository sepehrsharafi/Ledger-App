import * as SQLite from 'expo-sqlite';

import type { SqlDriver, SqlRow, SqlValue } from './driver';

/**
 * `expo-sqlite` implementation of the driver, used on iOS and Android. The synchronous API is
 * deliberate: every call is a fast local query, so screens need no extra loading states.
 *
 * `sqlite-driver.web.ts` replaces this file in web builds so `expo-sqlite` never reaches the
 * web bundle — Metro picks the platform variant automatically.
 */
export function createNativeDriver(databaseName = 'ledger.db'): SqlDriver {
  const db = SQLite.openDatabaseSync(databaseName);
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA foreign_keys = ON;');

  return {
    all<T extends SqlRow = SqlRow>(sql: string, params: SqlValue[] = []): T[] {
      return db.getAllSync<T>(sql, params);
    },
    get<T extends SqlRow = SqlRow>(sql: string, params: SqlValue[] = []): T | undefined {
      return db.getFirstSync<T>(sql, params) ?? undefined;
    },
    run(sql: string, params: SqlValue[] = []): void {
      db.runSync(sql, params);
    },
    exec(sql: string): void {
      db.execSync(sql);
    },
  };
}
