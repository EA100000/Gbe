import { useMemo, type ReactNode } from 'react';

import { RepositoriesContext } from './repositoriesContext';
import { browserStorage, createWebStorageRepositories } from './webStorageRepositories';

/**
 * Web : progression dans le stockage du navigateur (voir docs/adr/0004).
 * SQLite sur le web exige des en-têtes d'isolation que tous les hébergeurs n'offrent pas.
 */
export function PersistenceProvider({ children }: { children: ReactNode }) {
  const repositories = useMemo(() => createWebStorageRepositories(browserStorage()), []);
  return <RepositoriesContext value={repositories}>{children}</RepositoriesContext>;
}
