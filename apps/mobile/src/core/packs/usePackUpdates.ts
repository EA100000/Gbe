import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useContentStore } from '../content/contentStore';
import { queryClient } from '../query/queryClient';
import { installPack } from './installer';
import type { LocalPacksDeps } from './localPacks';
import type { FetchBytes } from './packStorage.types';
import { fetchCatalog, updatePacks } from './packUpdater';

/** Le catalogue n'est relu qu'au plus toutes les 30 minutes. */
export const CATALOG_STALE_MS = 30 * 60_000;

export interface PackUpdatesConfig extends LocalPacksDeps {
  /** Dossier du catalogue (EXPO_PUBLIC_PACKS_URL). */
  baseUrl: string;
  fetchBytes: FetchBytes;
}

/**
 * Met les packs à jour en arrière-plan : au démarrage puis à chaque retour dans l'appli.
 * Une nouvelle version n'est utilisée qu'après vérification complète, et seulement au
 * prochain passage sur le chemin des leçons (jamais au milieu d'une leçon).
 * `config` à `null` (pas d'adresse de catalogue, ou web) : rien ne se passe.
 */
export function usePackUpdates(config: PackUpdatesConfig | null, enabled: boolean): void {
  useEffect(() => {
    if (config === null || !enabled) return;
    const { baseUrl, fetchBytes, storage, sha256 } = config;
    // Une version refusée (empreinte fausse, pack invalide) n'est pas retéléchargée pendant la session.
    const rejected = new Set<string>();
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      try {
        const report = await updatePacks({
          catalog: () =>
            queryClient.fetchQuery({
              queryKey: ['packs', 'catalog', baseUrl],
              queryFn: () => fetchCatalog(baseUrl, fetchBytes),
              staleTime: CATALOG_STALE_MS,
              // Pas de nouvel essai immédiat : le prochain retour dans l'appli en fera un.
              retry: false,
            }),
          available: async () => [
            ...useContentStore.getState().contents.map((c) => ({
              id: c.pack.id,
              version: c.pack.version,
            })),
            ...(await storage.list()),
          ],
          skip: rejected,
          install: (entry) => installPack(entry, { baseUrl, fetchBytes, sha256, storage }),
        });
        for (const failure of report.failed) {
          if (failure.reason !== 'network') {
            rejected.add(`${failure.ref.id}@${failure.ref.version}`);
          }
          console.warn('Pack non installé', failure);
        }
        if (report.installed.length > 0) {
          await useContentStore.getState().refresh({ storage, sha256 });
        }
      } catch {
        // Catalogue injoignable (hors-ligne) : on réessaiera au prochain retour dans l'appli.
      } finally {
        running = false;
      }
    };

    void run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    return () => subscription.remove();
  }, [config, enabled]);
}
