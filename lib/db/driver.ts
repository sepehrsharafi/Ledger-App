export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;

/**
 * Minimal synchronous SQL surface. `expo-sqlite` backs it on device; Node's `node:sqlite`
 * backs it in `scripts/test-repository.ts`, so the repository is verifiable off-device.
 */
export interface SqlDriver {
  all<T extends SqlRow = SqlRow>(sql: string, params?: SqlValue[]): T[];
  get<T extends SqlRow = SqlRow>(sql: string, params?: SqlValue[]): T | undefined;
  run(sql: string, params?: SqlValue[]): void;
  /** Executes one or more statements with no parameters (schema, transactions). */
  exec(sql: string): void;
}

export function transaction<T>(driver: SqlDriver, fn: () => T): T {
  driver.exec('BEGIN');
  try {
    const result = fn();
    driver.exec('COMMIT');
    return result;
  } catch (error) {
    driver.exec('ROLLBACK');
    throw error;
  }
}
