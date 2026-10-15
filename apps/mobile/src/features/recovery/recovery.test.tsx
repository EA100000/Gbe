import { fireEvent, render, screen } from '@testing-library/react-native';
import { setStringAsync } from 'expo-clipboard';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { lessonCompletedEvent } from '../../core/progress/eventFactory';
import { useProgressStore } from '../../core/progress/progressStore';
import {
  ApiError,
  OfflineError,
  type ApiClient,
  type RecoveredAccount,
} from '../../core/sync/apiClient';
import { credentialStore, recoveryCodeStore } from '../../core/sync/credentials';
import { ServerContext, type Server } from '../../core/sync/serverContext';
import { fakeClock, setupStores } from '../../test-utils/fixtures';
import { ReasonScreen } from '../onboarding/ReasonScreen';
import { ProfileScreen } from '../profile/ProfileScreen';
import { RecoverAccountScreen } from './RecoverAccountScreen';
import { RecoveryCodeScreen } from './RecoveryCodeScreen';

const CODE = 'K7QM-3XRP-T9WD';
const RECOVERED: RecoveredAccount = {
  userId: 'compte-ancien',
  secret: 's'.repeat(43),
  accessToken: 'jeton-recupere',
  expiresIn: 3600,
  pseudo: 'Tortue sage',
};

function journal() {
  const clock = fakeClock(Date.UTC(2026, 9, 12, 9));
  return ['u01-l01', 'u01-l02'].map((lessonId) => {
    clock.advance(60_000);
    return lessonCompletedEvent(clock, {
      lessonId,
      unitId: 'u01',
      packId: 'u01-salutations',
      packVersion: 1,
      xp: 15,
      accuracy: 0.9,
      durationMs: 120_000,
    });
  });
}

function fakeServer(overrides: Partial<ApiClient> = {}) {
  const api = {
    setPseudo: jest.fn(async () => undefined),
    createRecoveryCode: jest.fn(async () => CODE),
    recover: jest.fn(async () => RECOVERED),
    events: jest.fn(async () => ({ events: journal(), nextCursor: null })),
    ...overrides,
  } as unknown as ApiClient;
  const server: Server = {
    api,
    engine: {
      sync: jest.fn(async () => ({ status: 'synced' as const, sent: 0 })),
      withAccessToken: (call) => call('jeton'),
      forgetToken: jest.fn(),
    },
  };
  return server;
}

function withServer(server: Server | null) {
  return ({ children }: { children: ReactNode }) => (
    <ServerContext.Provider value={server}>{children}</ServerContext.Provider>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await credentialStore.clear();
  await recoveryCodeStore.clear();
});

describe('liens vers la récupération', () => {
  it('propose « J’ai déjà un compte » dès le premier écran quand l’appli a un serveur', async () => {
    // Préparer
    await setupStores();
    // Agir
    await render(<ReasonScreen />, { wrapper: withServer(fakeServer()) });
    await fireEvent.press(screen.getByTestId('welcome-recover'));
    // Vérifier
    expect(router.push).toHaveBeenCalledWith('/recuperer');
  });

  it('cache ce lien sans serveur (appli hors-ligne)', async () => {
    await setupStores();

    await render(<ReasonScreen />, { wrapper: withServer(null) });

    expect(screen.queryByTestId('welcome-recover')).toBeNull();
  });

  it('ouvre le code de récupération depuis le profil', async () => {
    await setupStores();
    await useProgressStore.getState().completeOnboarding('regular');
    await render(<ProfileScreen />, { wrapper: withServer(fakeServer()) });

    await fireEvent.press(screen.getByTestId('profile-recovery-code'));

    expect(router.push).toHaveBeenCalledWith('/code-recuperation');
  });

  it('n’affiche pas cette ligne sans serveur', async () => {
    await setupStores();
    await useProgressStore.getState().completeOnboarding('regular');

    await render(<ProfileScreen />, { wrapper: withServer(null) });

    expect(screen.queryByTestId('profile-recovery-code')).toBeNull();
  });
});

describe('écran 13 : code de récupération', () => {
  it('envoie d’abord le journal, puis montre le code, lisible lettre par lettre', async () => {
    await setupStores();
    const server = fakeServer();

    await render(<RecoveryCodeScreen />, { wrapper: withServer(server) });

    expect(await screen.findByText(CODE)).toBeOnTheScreen();
    expect(server.engine.sync).toHaveBeenCalled();
    expect(screen.getByLabelText('Code : K 7 Q M, 3 X R P, T 9 W D')).toBeOnTheScreen();
  });

  it('copie le code', async () => {
    await setupStores();
    await render(<RecoveryCodeScreen />, { wrapper: withServer(fakeServer()) });
    await screen.findByText(CODE);

    await fireEvent.press(screen.getByTestId('recovery-copy'));

    expect(setStringAsync).toHaveBeenCalledWith(CODE);
    expect(await screen.findByText('Code copié')).toBeOnTheScreen();
  });

  it('explique qu’il faut du réseau, puis réessaie', async () => {
    await setupStores();
    const createRecoveryCode = jest
      .fn<Promise<string>, [string]>()
      .mockRejectedValueOnce(new OfflineError('coupé'))
      .mockResolvedValueOnce(CODE);
    await render(<RecoveryCodeScreen />, {
      wrapper: withServer(fakeServer({ createRecoveryCode })),
    });
    expect(
      await screen.findByText('Il faut une connexion internet pour créer ton code.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Réessayer'));

    expect(await screen.findByText(CODE)).toBeOnTheScreen();
  });
});

describe('écran 14 : j’ai déjà un compte', () => {
  it('attend un code complet avant de chercher', async () => {
    await setupStores();
    const server = fakeServer();
    await render(<RecoverAccountScreen />, { wrapper: withServer(server) });

    await fireEvent.changeText(screen.getByTestId('recover-input'), 'K7QM-3XRP');
    await fireEvent.press(screen.getByTestId('recover-submit'));

    expect(server.api.recover).not.toHaveBeenCalled();
    expect(screen.getByText('12 lettres et chiffres, tirets facultatifs.')).toBeOnTheScreen();
  });

  it('retrouve la progression, l’affiche, puis mène au chemin', async () => {
    // Préparer : un téléphone neuf.
    await setupStores();
    const server = fakeServer();
    await render(<RecoverAccountScreen />, { wrapper: withServer(server) });

    // Agir
    await fireEvent.changeText(screen.getByTestId('recover-input'), 'k7qm 3xrp t9wd');
    await fireEvent.press(screen.getByTestId('recover-submit'));

    // Vérifier : compte gardé, progression rendue, accueil passé.
    expect(await screen.findByText('Te revoilà, Tortue sage !')).toBeOnTheScreen();
    expect(screen.getByLabelText('Leçons : 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('XP : 30')).toBeOnTheScreen();
    expect(await credentialStore.load()).toEqual({
      userId: 'compte-ancien',
      secret: RECOVERED.secret,
    });
    expect(server.engine.forgetToken).toHaveBeenCalled();
    const state = useProgressStore.getState();
    expect(state.settings.onboarded).toBe(true);
    expect(state.settings.pseudo).toBe('Tortue sage');
    expect(await state.repositories?.events.unsynced(10)).toEqual([]);

    await fireEvent.press(screen.getByTestId('recover-continue'));
    expect(router.dismissAll).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('dit quand le code ne correspond à aucun compte', async () => {
    await setupStores();
    const server = fakeServer({
      recover: jest.fn(async () => Promise.reject(new ApiError(401, 'refus'))),
    });
    await render(<RecoverAccountScreen />, { wrapper: withServer(server) });

    await fireEvent.changeText(screen.getByTestId('recover-input'), 'K7QM-3XRP-T9WB');
    await fireEvent.press(screen.getByTestId('recover-submit'));

    expect(
      await screen.findByText('Ce code ne correspond à aucun compte. Vérifie chaque caractère.'),
    ).toBeOnTheScreen();
    expect(useProgressStore.getState().settings.onboarded).toBe(false);
  });

  it('dit quand le réseau manque', async () => {
    await setupStores();
    const server = fakeServer({
      recover: jest.fn(async () => Promise.reject(new OfflineError('coupé'))),
    });
    await render(<RecoverAccountScreen />, { wrapper: withServer(server) });

    await fireEvent.changeText(screen.getByTestId('recover-input'), CODE);
    await fireEvent.press(screen.getByTestId('recover-submit'));

    expect(
      await screen.findByText('Pas de connexion. Il en faut une pour retrouver ton compte.'),
    ).toBeOnTheScreen();
  });

  it('ramène à l’accueil pour commencer à zéro', async () => {
    await setupStores();
    await render(<RecoverAccountScreen />, { wrapper: withServer(fakeServer()) });

    await fireEvent.press(screen.getByTestId('recover-start-fresh'));

    expect(router.back).toHaveBeenCalled();
  });
});
