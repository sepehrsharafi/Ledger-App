import { createNativeDriver } from './sqlite-driver';
import { createRepository, type Repository } from './repository';
import { seed } from './seed';
import { DATA_VERSION, initializeDatabase } from './setup';

let repository: Repository | null = null;

/** Lazily opens the on-device database on first use, creating and seeding it if needed. */
export function getRepository(): Repository {
  if (!repository) repository = initializeDatabase(createNativeDriver());
  return repository;
}

/** Drops all data and reseeds — backs the "Reset demo data" action in Settings. */
export function resetDatabase(): Repository {
  const driver = createNativeDriver();
  seed(driver);
  driver.exec(`PRAGMA user_version = ${DATA_VERSION}`);
  repository = createRepository(driver);
  return repository;
}
