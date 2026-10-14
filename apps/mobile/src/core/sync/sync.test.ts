import type { GameEvent } from '@gbe/domain';

import { fakeClock, memoryDatabase } from '../../test-utils/fixtures';
import { createEventRepository, type EventRepository } from '../db/repositories';
import { createWebStorageRepositories, memoryStorage } from '../db/webStorageRepositories';
import { heartLostEvent } from '../progress/eventFactory';
import {
  ApiError,
  OfflineError,
  createApiClient,
  type ApiClient,
  type FetchLike,
} from './apiClient';
import { apiUrl } from './backgroundSync';
import { parseCredentials, type CredentialStore, type GuestCredentials } from './credentialsShared';
import { SYNC_BATCH, createSyncEngine } from './syncEngine';

const SECRET = 's'.repeat(43);
const HOUR_S = 3600;

/** Journal de test : `count` événements distincts, du plus ancien au plus récent. */
function makeEvents(count: number): GameEvent[] {
  const clock = fakeClock();
  return Array.from({ length: count }, (_, i) => {
    clock.advance(1000);
    return heartLostEvent(clock, `l${i}`);
  });
}

function memoryCredentials(initial: GuestCredentials | null = null) {
  let saved = initial;
  const store: CredentialStore & { current: () => GuestCredentials | null } = {
    load: async () => saved,
    save: async (c) => {
      saved = c;
    },
    clear: async () => {
      saved = null;
    },
    current: () => saved,
  };
  return store;
}

/** Faux serveur : compte les appels et reçoit les événements. */
function fakeApi(overrides: Partial<ApiClient> = {}) {
  const received: GameEvent[] = [];
  let guests = 0;
  const api = {
    createGuest: jest.fn(async () => {
      guests += 1;
      return {
        userId: `user-${guests}`,
        secret: SECRET,
        accessToken: `guest-token-${guests}`,
        expiresIn: HOUR_S,
      };
    }),
    token: jest.fn(async () => ({ accessToken: 'fresh-token', expiresIn: HOUR_S })),
    sendEvents: jest.fn(async (_token: string, events: readonly GameEvent[]) => {
      received.push(...events);
      return { accepted: events.length, duplicates: 0 };
    }),
    deleteAccount: jest.fn(async () => undefined),
    ...overrides,
  };
  return { api, received };
}

async function setup(options: { events?: number; credentials?: GuestCredentials | null } = {}) {
  const repo = createEventRepository(memoryDatabase());
  const events = makeEvents(options.events ?? 3);
  await repo.append(events);
  const clock = fakeClock();
  const credentials = memoryCredentials(options.credentials ?? null);
  return { repo, events, clock, credentials };
}

describe('synchronisation du journal', () => {
  it('ne crée aucun compte tant qu’il n’y a rien à envoyer', async () => {
    // Préparer
    const { repo, clock, credentials } = await setup({ events: 0 });
    const { api } = fakeApi();
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });
    // Agir
    const outcome = await engine.sync();
    // Vérifier
    expect(outcome).toEqual({ status: 'synced', sent: 0 });
    expect(api.createGuest).not.toHaveBeenCalled();
  });

  it('crée un compte invité au premier envoi et garde ses identifiants', async () => {
    const { repo, events, clock, credentials } = await setup();
    const { api, received } = fakeApi();
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    const outcome = await engine.sync();

    expect(outcome).toEqual({ status: 'synced', sent: 3 });
    expect(credentials.current()).toEqual({ userId: 'user-1', secret: SECRET });
    expect(api.sendEvents).toHaveBeenCalledWith('guest-token-1', events);
    expect(api.token).not.toHaveBeenCalled();
    expect(received).toEqual(events);
  });

  it('n’envoie plus les événements déjà reçus par le serveur', async () => {
    const { repo, clock, credentials } = await setup();
    const { api } = fakeApi();
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });
    await engine.sync();

    const second = await engine.sync();

    expect(second).toEqual({ status: 'synced', sent: 0 });
    expect(api.sendEvents).toHaveBeenCalledTimes(1);
    expect(await repo.unsynced(SYNC_BATCH)).toEqual([]);
  });

  it('reprend le compte enregistré au lieu d’en créer un autre', async () => {
    const { repo, clock, credentials } = await setup({
      credentials: { userId: 'user-9', secret: SECRET },
    });
    const { api } = fakeApi();
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    await engine.sync();

    expect(api.createGuest).not.toHaveBeenCalled();
    expect(api.token).toHaveBeenCalledWith('user-9', SECRET);
    expect(api.sendEvents).toHaveBeenCalledWith('fresh-token', expect.any(Array));
  });

  it('garde le jeton tant qu’il est valide, puis en demande un nouveau', async () => {
    const { repo, clock, credentials } = await setup({
      credentials: { userId: 'user-9', secret: SECRET },
    });
    const { api } = fakeApi();
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });
    await engine.sync();

    await repo.append(makeEvents(4).slice(3));
    clock.advance(30 * 60_000);
    await engine.sync();
    expect(api.token).toHaveBeenCalledTimes(1);

    await repo.append([heartLostEvent(clock, 'tard')]);
    clock.advance(30 * 60_000);
    await engine.sync();
    expect(api.token).toHaveBeenCalledTimes(2);
  });

  it('envoie un long journal par lots', async () => {
    const { repo, clock, credentials } = await setup({ events: SYNC_BATCH * 2 + 50 });
    const { api, received } = fakeApi();
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    const outcome = await engine.sync();

    expect(outcome).toEqual({ status: 'synced', sent: SYNC_BATCH * 2 + 50 });
    expect(api.sendEvents).toHaveBeenCalledTimes(3);
    expect(new Set(received.map((e) => e.id)).size).toBe(SYNC_BATCH * 2 + 50);
  });

  it('garde les événements pour plus tard quand le réseau manque', async () => {
    const { repo, clock, credentials } = await setup();
    const { api } = fakeApi({
      createGuest: jest.fn(async () => {
        throw new OfflineError(new TypeError('Network request failed'));
      }),
    });
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    const outcome = await engine.sync();

    expect(outcome).toEqual({ status: 'offline' });
    expect(await repo.unsynced(SYNC_BATCH)).toHaveLength(3);
  });

  it('redemande un jeton une fois quand le serveur refuse l’ancien', async () => {
    const { repo, clock, credentials } = await setup();
    let refusals = 1;
    const { api } = fakeApi();
    const send = api.sendEvents;
    api.sendEvents = jest.fn(async (token: string, events: readonly GameEvent[]) => {
      if (refusals > 0) {
        refusals -= 1;
        throw new ApiError(401, 'expiré');
      }
      return send(token, events);
    });
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    const outcome = await engine.sync();

    expect(outcome).toEqual({ status: 'synced', sent: 3 });
    expect(api.token).toHaveBeenCalledTimes(1);
  });

  it('remplace un compte refusé par le serveur par un nouveau compte invité', async () => {
    const { repo, clock, credentials } = await setup({
      credentials: { userId: 'supprimé', secret: SECRET },
    });
    const { api } = fakeApi({
      token: jest.fn(async () => {
        throw new ApiError(401, 'Identifiants invalides');
      }),
    });
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    const outcome = await engine.sync();

    expect(outcome).toEqual({ status: 'synced', sent: 3 });
    expect(api.createGuest).toHaveBeenCalledTimes(1);
    expect(credentials.current()?.userId).toBe('user-1');
  });

  it('abandonne après un seul nouvel essai si le serveur refuse toujours', async () => {
    const { repo, clock, credentials } = await setup();
    const { api } = fakeApi({
      sendEvents: jest.fn(async () => {
        throw new ApiError(401, 'Jeton invalide ou expiré');
      }),
    });
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    const outcome = await engine.sync();

    expect(outcome.status).toBe('error');
    expect(api.sendEvents).toHaveBeenCalledTimes(2);
    expect(await repo.unsynced(SYNC_BATCH)).toHaveLength(3);
  });

  it('ne lance qu’un envoi à la fois', async () => {
    const { repo, clock, credentials } = await setup();
    const { api } = fakeApi();
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    const [a, b] = await Promise.all([engine.sync(), engine.sync()]);

    expect(a).toEqual(b);
    expect(api.sendEvents).toHaveBeenCalledTimes(1);
  });

  it('signale une erreur du serveur sans perdre les événements', async () => {
    const { repo, clock, credentials } = await setup();
    const { api } = fakeApi({
      sendEvents: jest.fn(async () => {
        throw new ApiError(500, 'Erreur 500');
      }),
    });
    const engine = createSyncEngine({ api, credentials, events: repo, now: clock.now });

    expect(await engine.sync()).toEqual({ status: 'error', message: 'Erreur 500' });
    expect(await repo.unsynced(SYNC_BATCH)).toHaveLength(3);
  });
});

describe('client de l’API', () => {
  function respond(status: number, body: unknown): FetchLike {
    return jest.fn(async () => new Response(JSON.stringify(body), { status }));
  }

  it('appelle la bonne adresse avec le jeton et le corps attendus', async () => {
    const fetchImpl = respond(200, { accepted: 1, duplicates: 0 });
    const client = createApiClient('https://api.exemple.bj/', fetchImpl);
    const events = makeEvents(1);

    const result = await client.sendEvents('jeton', events);

    expect(result).toEqual({ accepted: 1, duplicates: 0 });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.exemple.bj/v1/sync/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jeton' },
      body: JSON.stringify({ events }),
    });
  });

  it('supprime le compte sans attendre de corps de réponse', async () => {
    const fetchImpl: FetchLike = jest.fn(async () => new Response(null, { status: 204 }));
    const client = createApiClient('https://api', fetchImpl);

    await client.deleteAccount('jeton');

    expect(fetchImpl).toHaveBeenCalledWith('https://api/v1/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jeton' },
      body: undefined,
    });
  });

  it('valide la réponse de création de compte', async () => {
    const guest = { userId: 'u', secret: SECRET, accessToken: 't', expiresIn: HOUR_S };
    const client = createApiClient('https://api', respond(201, guest));
    await expect(client.createGuest()).resolves.toEqual(guest);
  });

  it('transforme un statut d’erreur en ApiError avec son code', async () => {
    const client = createApiClient('https://api', respond(401, { message: 'non' }));
    await expect(client.token('u', SECRET)).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('traite une panne réseau comme un passage hors-ligne', async () => {
    const client = createApiClient('https://api', async () => {
      throw new TypeError('Network request failed');
    });
    await expect(client.createGuest()).rejects.toBeInstanceOf(OfflineError);
  });

  it('refuse une réponse qui ne respecte pas le contrat', async () => {
    const client = createApiClient('https://api', respond(200, { accessToken: 42 }));
    await expect(client.token('u', SECRET)).rejects.toBeInstanceOf(OfflineError);
  });

  it('refuse une réponse qui n’est pas du JSON', async () => {
    const client = createApiClient(
      'https://api',
      async () => new Response('<html>', { status: 200 }),
    );
    await expect(client.createGuest()).rejects.toBeInstanceOf(OfflineError);
  });
});

describe('réglages de la synchronisation', () => {
  it('reste désactivée sans adresse d’API', () => {
    expect(apiUrl(undefined)).toBeNull();
    expect(apiUrl('  ')).toBeNull();
    expect(apiUrl(' https://api.gbe.app ')).toBe('https://api.gbe.app');
  });

  it('relit des identifiants valides et ignore les autres', () => {
    expect(parseCredentials(JSON.stringify({ userId: 'u', secret: SECRET }))).toEqual({
      userId: 'u',
      secret: SECRET,
    });
    expect(parseCredentials(null)).toBeNull();
    expect(parseCredentials('')).toBeNull();
    expect(parseCredentials('{abîmé')).toBeNull();
    expect(parseCredentials(JSON.stringify({ userId: 'u', secret: 'court' }))).toBeNull();
  });
});

describe.each<[string, () => EventRepository]>([
  ['SQLite', () => createEventRepository(memoryDatabase())],
  ['navigateur', () => createWebStorageRepositories(memoryStorage()).events],
])('événements à synchroniser (%s)', (_name, makeRepo) => {
  it('rend les plus anciens d’abord, dans la limite demandée', async () => {
    const repo = makeRepo();
    const events = makeEvents(5);
    await repo.append([...events].reverse());

    expect(await repo.unsynced(2)).toEqual(events.slice(0, 2));
  });

  it('ne rend plus ceux marqués comme reçus', async () => {
    const repo = makeRepo();
    const events = makeEvents(3);
    await repo.append(events);

    await repo.markSynced([events[0]?.id ?? '', events[2]?.id ?? '']);
    await repo.markSynced([]);

    expect(await repo.unsynced(10)).toEqual([events[1]]);
    expect(await repo.all()).toHaveLength(3);
  });
});
