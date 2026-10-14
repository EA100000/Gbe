import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { retryPendingDeletion } from '../account/accountDeletion';
import { systemClock } from '../clock';
import type { Repositories } from '../db/repositories';
import { useProgressStore } from '../progress/progressStore';
import { createApiClient, type ApiClient } from './apiClient';
import { credentialStore, pendingDeletionStore } from './credentials';
import { createSyncEngine, type SyncEngine } from './syncEngine';

/** Délai après un nouvel événement, pour grouper ceux d'une même leçon en un seul envoi. */
export const SYNC_DEBOUNCE_MS = 3_000;

/**
 * Adresse de l'API, fixée au moment du build (`EXPO_PUBLIC_API_URL`).
 * Absente : la synchronisation est désactivée et l'appli reste 100 % hors-ligne (démo web).
 */
export function apiUrl(raw: string | undefined = process.env.EXPO_PUBLIC_API_URL): string | null {
  const url = raw?.trim();
  return url === undefined || url.length === 0 ? null : url;
}

let client: ApiClient | null | undefined;

/** Client de l'API de l'appli, ou `null` si aucune API n'est configurée. */
export function appApiClient(): ApiClient | null {
  if (client === undefined) {
    const url = apiUrl();
    client = url === null ? null : createApiClient(url);
  }
  return client;
}

/**
 * Moteur de synchronisation de l'appli, ou `null` si aucune API n'est configurée.
 * Avant chaque envoi, termine une suppression de compte restée en attente.
 */
export function useSyncEngine(repositories: Repositories): SyncEngine | null {
  return useMemo(() => {
    const api = appApiClient();
    if (api === null) return null;
    const engine = createSyncEngine({
      api,
      credentials: credentialStore,
      events: repositories.events,
      now: () => systemClock.now(),
    });
    return {
      sync: async () => {
        await retryPendingDeletion({ api, pendingDeletion: pendingDeletionStore }).catch(
          () => undefined,
        );
        return engine.sync();
      },
      withAccessToken: engine.withAccessToken,
    };
  }, [repositories]);
}

/**
 * Déclenche la synchronisation : au démarrage, au retour de l'appli au premier plan
 * et peu après chaque nouvel événement. Les échecs sont silencieux : on réessaie au prochain déclencheur.
 */
export function useBackgroundSync(engine: SyncEngine | null, enabled: boolean): void {
  useEffect(() => {
    if (engine === null || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delayMs: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void engine.sync(), delayMs);
    };

    schedule(0);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule(0);
    });
    const unsubscribe = useProgressStore.subscribe((state, previous) => {
      if (state.events !== previous.events) schedule(SYNC_DEBOUNCE_MS);
    });

    return () => {
      clearTimeout(timer);
      appState.remove();
      unsubscribe();
    };
  }, [engine, enabled]);
}
