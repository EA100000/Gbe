import { UiText, colors } from '@gbe/ui';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useContentStore } from './content/contentStore';
import { useRepositories } from './db/repositoriesContext';
import { t } from './i18n';
import { useProgressStore } from './progress/progressStore';
import { useBackgroundSync, useSyncEngine } from './sync/backgroundSync';

/**
 * Prépare l'appli avant le premier écran : pack validé, journal et réglages relus.
 * Tant que ce n'est pas prêt, l'écran de lancement reste affiché.
 * Lance aussi la synchronisation du journal avec le serveur, si une API est configurée.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  const repositories = useRepositories();
  const contentStatus = useContentStore((s) => s.status);
  const loadBundled = useContentStore((s) => s.loadBundled);
  const ready = useProgressStore((s) => s.ready);
  const hydrate = useProgressStore((s) => s.hydrate);
  const syncEngine = useSyncEngine(repositories);
  useBackgroundSync(syncEngine, ready);

  useEffect(() => {
    loadBundled();
    void hydrate(repositories);
  }, [repositories, loadBundled, hydrate]);

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
  return <>{children}</>;
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
