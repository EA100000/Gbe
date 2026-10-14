import { createContext, useContext } from 'react';

import type { ApiClient } from './apiClient';
import type { SyncEngine } from './syncEngine';

export interface Server {
  api: ApiClient;
  engine: SyncEngine;
}

/** Accès au serveur pour les écrans qui en lisent les données (Ligue) ; `null` sans API. */
export const ServerContext = createContext<Server | null>(null);

export function useServer(): Server | null {
  return useContext(ServerContext);
}
