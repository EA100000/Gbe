import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import {
  bundledPackJson,
  CDN,
  fakeCdn,
  memoryPackStorage,
  nodeSha256,
  publish,
} from '../../test-utils/packFixtures';
import { useContentStore } from '../content/contentStore';
import { queryClient } from '../query/queryClient';
import { usePackUpdates, type PackUpdatesConfig } from './usePackUpdates';

/** Laisse s'exécuter les promesses en attente (téléchargements simulés). */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
  });
}

describe('mise à jour des packs en arrière-plan', () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(async () => {
    queryClient.clear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
    await useContentStore.getState().load(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Le cache garde ses minuteries de nettoyage : on les arrête pour que Jest puisse finir.
  afterAll(() => queryClient.clear());

  function config(cdn: ReturnType<typeof fakeCdn>) {
    const mem = memoryPackStorage();
    const value: PackUpdatesConfig = {
      baseUrl: CDN,
      fetchBytes: cdn.fetchBytes,
      storage: mem.storage,
      sha256: nodeSha256,
    };
    return { value, mem };
  }

  it('télécharge la nouvelle version et la met en attente du chemin', async () => {
    // Préparer
    const cdn = fakeCdn([publish(bundledPackJson(2))]);
    const { value, mem } = config(cdn);
    // Agir
    await renderHook(() => usePackUpdates(value, true));
    await settle();
    // Vérifier
    expect([...mem.installed.keys()]).toEqual(['u01-salutations@2']);
    expect(useContentStore.getState().content?.pack.version).toBe(1);
    expect(useContentStore.getState().pending?.[0]?.pack.version).toBe(2);
  });

  it('ne fait rien tant que l’appli n’est pas prête', async () => {
    const cdn = fakeCdn([publish(bundledPackJson(2))]);
    const { value } = config(cdn);

    await renderHook(() => usePackUpdates(value, false));
    await settle();

    expect(cdn.requests).toEqual([]);
  });

  it('ne retélécharge pas un pack refusé au retour dans l’appli', async () => {
    const published = publish(bundledPackJson(2));
    const cdn = fakeCdn([
      { ...published, entry: { ...published.entry, manifestSha256: '0'.repeat(64) } },
    ]);
    const { value } = config(cdn);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderHook(() => usePackUpdates(value, true));
    await settle();
    const manifestRequests = () => cdn.requests.filter((u) => u.endsWith('manifest.json')).length;
    expect(manifestRequests()).toBe(1);

    await act(async () => appStateListener?.('active'));
    await settle();

    expect(manifestRequests()).toBe(1);
    expect(warn).toHaveBeenCalled();
  });

  it('reste silencieuse hors-ligne', async () => {
    const value: PackUpdatesConfig = {
      ...config(fakeCdn([])).value,
      fetchBytes: async () => {
        throw new TypeError('Network request failed');
      },
    };

    await renderHook(() => usePackUpdates(value, true));
    await settle();

    expect(useContentStore.getState().pending).toBeNull();
  });
});
