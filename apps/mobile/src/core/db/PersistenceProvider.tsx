import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useMemo, type ReactNode } from 'react';

import { DATABASE_NAME, migrate } from './database';
import { createEventRepository, createSettingsRepository } from './repositories';
import { RepositoriesContext } from './repositoriesContext';

function SQLiteRepositories({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const repositories = useMemo(
    () => ({ events: createEventRepository(db), settings: createSettingsRepository(db) }),
    [db],
  );
  return <RepositoriesContext value={repositories}>{children}</RepositoriesContext>;
}

/** Android et iOS : progression dans SQLite, migrée au démarrage. */
export function PersistenceProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      <SQLiteRepositories>{children}</SQLiteRepositories>
    </SQLiteProvider>
  );
}
