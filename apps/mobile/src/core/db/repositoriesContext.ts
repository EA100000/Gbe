import { createContext, useContext } from 'react';

import type { Repositories } from './repositories';

/** Accès aux dépôts (SQLite sur téléphone, stockage du navigateur sur le web). */
export const RepositoriesContext = createContext<Repositories | null>(null);

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (repositories === null) throw new Error('PersistenceProvider manquant');
  return repositories;
}
