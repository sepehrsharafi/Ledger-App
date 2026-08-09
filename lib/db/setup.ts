import type { SqlDriver } from './driver';
import { createRepository, type Repository } from './repository';
import { SCHEMA_SQL } from './schema';
import { seed } from './seed';

/** Bump when the schema or seed changes so existing installs rebuild their database. */
export const DATA_VERSION = 6;

/**
 * Creates the schema, seeds on first launch, and returns the repository. Driver-agnostic on
 * purpose: the app passes expo-sqlite, the test script passes Node's SQLite.
 *
 * The version lives in SQLite's own `user_version`, so shipping an app update with a changed
 * schema reseeds instead of querying stale tables.
 */
export function initializeDatabase(driver: SqlDriver): Repository {
  driver.exec(SCHEMA_SQL);

  const versionRow = driver.get<{ user_version: number }>('PRAGMA user_version');
  const version = Number(versionRow?.user_version ?? 0);
  const projectRow = driver.get<{ c: number }>('SELECT COUNT(*) AS c FROM projects');
  const isEmpty = Number(projectRow?.c ?? 0) === 0;

  if (isEmpty || version !== DATA_VERSION) {
    seed(driver);
    driver.exec(`PRAGMA user_version = ${DATA_VERSION}`);
  }

  return createRepository(driver);
}
