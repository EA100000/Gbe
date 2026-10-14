import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { fakeClock, setupStores } from '../../test-utils/fixtures';
import { heartLostEvent } from '../progress/eventFactory';
import { useProgressStore } from '../progress/progressStore';
import { SYNC_DEBOUNCE_MS, useBackgroundSync } from './backgroundSync';
import { credentialStore as nativeStore } from './credentials';
import { credentialStore as webStore } from './credentials.web';
import type { SyncEngine } from './syncEngine';

const SECRET = 's'.repeat(43);

/** Fait avancer les minuteries simulées (toutes celles en attente, ou `ms` millisecondes). */
async function tick(ms?: number) {
  await act(async () => {
    if (ms === undefined) jest.runOnlyPendingTimers();
    else jest.advanceTimersByTime(ms);
  });
}

function fakeEngine(): SyncEngine & { sync: jest.Mock } {
  return { sync: jest.fn(async () => ({ status: 'synced' as const, sent: 0 })) };
}

describe('déclencheurs de la synchronisation', () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('synchronise une fois au démarrage', async () => {
    // Préparer
    await setupStores();
    const engine = fakeEngine();
    // Agir
    await renderHook(() => useBackgroundSync(engine, true));
    await tick();
    // Vérifier
    expect(engine.sync).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien tant que la progression n’est pas chargée', async () => {
    await setupStores();
    const engine = fakeEngine();

    await renderHook(() => useBackgroundSync(engine, false));
    await tick();

    expect(engine.sync).not.toHaveBeenCalled();
  });

  it('regroupe les événements d’une leçon en un seul envoi', async () => {
    await setupStores();
    const engine = fakeEngine();
    await renderHook(() => useBackgroundSync(engine, true));
    await tick();
    const clock = fakeClock();

    await act(async () => {
      await useProgressStore.getState().record([heartLostEvent(clock, 'l1')]);
      await useProgressStore.getState().record([heartLostEvent(clock, 'l2')]);
    });
    await tick(SYNC_DEBOUNCE_MS - 1);
    expect(engine.sync).toHaveBeenCalledTimes(1);
    await tick(1);

    expect(engine.sync).toHaveBeenCalledTimes(2);
  });

  it('synchronise au retour de l’appli au premier plan', async () => {
    await setupStores();
    const engine = fakeEngine();
    await renderHook(() => useBackgroundSync(engine, true));
    await tick();

    await act(async () => appStateListener?.('background'));
    await tick();
    await act(async () => appStateListener?.('active'));
    await tick();

    expect(engine.sync).toHaveBeenCalledTimes(2);
  });

  it('arrête d’écouter quand l’appli se ferme', async () => {
    await setupStores();
    const engine = fakeEngine();
    const { unmount } = await renderHook(() => useBackgroundSync(engine, true));

    await unmount();
    await tick();

    expect(engine.sync).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });
});

describe.each([
  ['téléphone', nativeStore],
  ['navigateur', webStore],
])('identifiants du compte invité (%s)', (_name, store) => {
  it('enregistre, relit puis efface les identifiants', async () => {
    const credentials = { userId: 'u', secret: SECRET };

    await store.save(credentials);
    expect(await store.load()).toEqual(credentials);

    await store.clear();
    expect(await store.load()).toBeNull();
  });
});
