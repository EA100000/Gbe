import { UiText, colors } from '@gbe/ui';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useContentStore } from './content/contentStore';
import { useRepositories } from './db/repositoriesContext';
import { t } from './i18n';
import { sha256Hex } from './packs/bytes';
import { fetchBytes } from './packs/fetchBytes';
import type { LocalPacksDeps } from './packs/localPacks';
import { createPackStorage } from './packs/packStorage';
import { packsUrl } from './packs/packUpdater';
import { usePackUpdates, type PackUpdatesConfig } from './packs/usePackUpdates';
import { useProgressStore } from './progress/progressStore';
import { appApiClient, useBackgroundSync, useSyncEngine } from './sync/backgroundSync';
import { ServerContext, type Server } from './sync/serverContext';

/**
 * Prépare l'appli avant le premier écran : packs vérifiés, journal et réglages relus.
 * Tant que ce n'est pas prêt, l'écran de lancement reste affiché.
 * Lance aussi, si elles sont configurées, la synchronisation du journal et la mise à jour des packs.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  const repositories = useRepositories();
  const contentStatus = useContentStore((s) => s.status);
  const loadContent = useContentStore((s) => s.load);
  const ready = useProgressStore((s) => s.ready);
  const hydrate = useProgressStore((s) => s.hydrate);
  const syncEngine = useSyncEngine(repositories);
  useBackgroundSync(syncEngine, ready);
  const server = useMemo<Server | null>(() => {
    const api = appApiClient();
    return api === null || syncEngine === null ? null : { api, engine: syncEngine };
  }, [syncEngine]);
  const packDeps = useMemo<LocalPacksDeps | null>(() => {
    const storage = createPackStorage();
    return storage === null ? null : { storage, sha256: sha256Hex };
  }, []);
  const updates = useMemo<PackUpdatesConfig | null>(() => {
    const baseUrl = packsUrl();
    return packDeps === null || baseUrl === null ? null : { ...packDeps, baseUrl, fetchBytes };
  }, [packDeps]);
  usePackUpdates(updates, ready && contentStatus === 'ready');

  useEffect(() => {
    void loadContent(packDeps);
    void hydrate(repositories);
  }, [repositories, packDeps, loadContent, hydrate]);

  const loaded = ready && contentStatus !== 'idle';
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  if (contentStatus === 'error') {
    return (
      <View style={styles.error}>
        <UiText size={17} weight="bold" style={styles.center}>
          {t('content.loadError')}
        </UiText>
      </View>
    );
  }
  return <ServerContext.Provider value={server}>{children}</ServerContext.Provider>;
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  center: { textAlign: 'center' },
});
