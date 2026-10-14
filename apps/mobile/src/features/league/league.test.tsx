import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useProgressStore } from '../../core/progress/progressStore';
import { OfflineError, type ApiClient, type League } from '../../core/sync/apiClient';
import { ServerContext, type Server } from '../../core/sync/serverContext';
import { setupStores } from '../../test-utils/fixtures';
import { LeagueScreen } from './LeagueScreen';
import { avatarColors } from './useLeagueController';

const PSEUDOS = ['Tortue sage', 'Lion brave', 'Hibou calme', 'Colibri agile', 'Baobab drôle'];

function leagueWith(meRank: number, size: number): League {
  return {
    weekKey: '2026-10-12',
    // Fin de semaine : dans 3 jours et un peu, d'après l'horloge de test (13/10 à 9 h UTC).
    endsAt: Date.UTC(2026, 9, 16, 12),
    groupSize: 30,
    topCount: 5,
    members: Array.from({ length: size }, (_, i) => ({
      rank: i + 1,
      pseudo: PSEUDOS[i % PSEUDOS.length] ?? null,
      xp: 100 - i * 10,
      isMe: i + 1 === meRank,
    })),
  };
}

function fakeServer(league: () => Promise<League>) {
  const api = {
    setPseudo: jest.fn(async () => undefined),
    league: jest.fn(league),
  } as unknown as ApiClient & { setPseudo: jest.Mock; league: jest.Mock };
  const server: Server = {
    api,
    engine: {
      sync: jest.fn(async () => ({ status: 'synced' as const, sent: 0 })),
      withAccessToken: (call) => call('jeton'),
      forgetToken: jest.fn(),
    },
  };
  return { server, api };
}

async function renderLeague(server: Server) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ServerContext.Provider value={server}>{children}</ServerContext.Provider>
    </QueryClientProvider>
  );
  await render(<LeagueScreen />, { wrapper });
  return client;
}

describe('Ligue de la semaine', () => {
  beforeEach(async () => {
    await setupStores();
    await useProgressStore.getState().completeOnboarding('regular');
  });

  it('affiche le groupe classé, « Toi » mis en avant et les jours restants', async () => {
    // Préparer
    const { server, api } = fakeServer(async () => leagueWith(4, 7));
    // Agir
    const client = await renderLeague(server);
    // Vérifier
    expect(await screen.findByLabelText('Rang 4 : Toi, 70 XP')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rang 1 : Tortue sage, 100 XP')).toBeOnTheScreen();
    // Séparation décorative (masquée aux lecteurs d'écran : chaque ligne annonce déjà son rang).
    expect(screen.getByText('LES 5 PREMIERS', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('Encore 4 jours')).toBeOnTheScreen();
    expect(api.setPseudo).toHaveBeenCalledWith(
      'jeton',
      useProgressStore.getState().settings.pseudo,
    );
    expect(server.engine.sync).toHaveBeenCalled();
    client.clear();
  });

  it('n’affiche pas la séparation quand le groupe est petit', async () => {
    const { server } = fakeServer(async () => leagueWith(1, 3));

    const client = await renderLeague(server);

    expect(await screen.findByLabelText('Rang 1 : Toi, 100 XP')).toBeOnTheScreen();
    expect(screen.queryByText('LES 5 PREMIERS', { includeHiddenElements: true })).toBeNull();
    client.clear();
  });

  it('propose de réessayer sans connexion', async () => {
    let online = false;
    const { server } = fakeServer(async () => {
      if (!online) throw new OfflineError(new TypeError('Network request failed'));
      return leagueWith(1, 2);
    });
    const client = await renderLeague(server);
    expect(await screen.findByTestId('league-offline')).toBeOnTheScreen();

    online = true;
    await fireEvent.press(screen.getByText('Réessayer'));

    expect(await screen.findByLabelText('Rang 1 : Toi, 100 XP')).toBeOnTheScreen();
    client.clear();
  });

  it('donne toujours la même couleur au même pseudo', () => {
    expect(avatarColors('Lion sage')).toEqual(avatarColors('Lion sage'));
  });
});
