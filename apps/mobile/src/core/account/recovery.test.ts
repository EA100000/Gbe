import type { GameEvent } from '@gbe/domain';

import { fakeClock } from '../../test-utils/fixtures';
import { lessonCompletedEvent } from '../progress/eventFactory';
import {
  ApiError,
  OfflineError,
  createApiClient,
  type ApiClient,
  type EventsPage,
  type FetchLike,
  type RecoveredAccount,
} from '../sync/apiClient';
import type { CredentialStore, GuestCredentials, SecretTextStore } from '../sync/credentialsShared';
import { loadRecoveryCode, recoverAccount, type RecoveryDeps } from './recovery';

const SECRET = 's'.repeat(43);
const CODE = 'K7QM-3XRP-T9WD';

function makeEvents(count: number): GameEvent[] {
  const clock = fakeClock();
  return Array.from({ length: count }, (_, i) => {
    clock.advance(60_000);
    return lessonCompletedEvent(clock, {
      lessonId: `u01-l0${(i % 5) + 1}`,
      unitId: 'u01',
      packId: 'u01-salutations',
      packVersion: 1,
      xp: 15,
      accuracy: 0.9,
      durationMs: 120_000,
    });
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

function memoryText(initial: string | null = null) {
  let saved = initial;
  const store: SecretTextStore & { current: () => string | null } = {
    load: async () => saved,
    save: async (v) => {
      saved = v;
    },
    clear: async () => {
      saved = null;
    },
    current: () => saved,
  };
  return store;
}

const RECOVERED: RecoveredAccount = {
  userId: 'compte-ancien',
  secret: SECRET,
  accessToken: 'jeton-recupere',
  expiresIn: 3600,
  pseudo: 'Tortue sage',
};

function fakeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    createGuest: jest.fn(),
    token: jest.fn(),
    sendEvents: jest.fn(),
    deleteAccount: jest.fn(),
    setPseudo: jest.fn(),
    league: jest.fn(),
    createRecoveryCode: jest.fn(async () => CODE),
    recover: jest.fn(async () => RECOVERED),
    events: jest.fn(async (): Promise<EventsPage> => ({ events: [], nextCursor: null })),
    ...overrides,
  };
}

function recoveryDeps(api: ApiClient) {
  const deps = {
    api,
    credentials: memoryCredentials(),
    recoveryCode: memoryText(),
    forgetToken: jest.fn(),
    restore: jest.fn(async (_events: readonly GameEvent[], _pseudo: string | null) => undefined),
  } satisfies RecoveryDeps;
  return deps;
}

describe('récupération du compte', () => {
  it('garde le nouveau secret et le code, recopie le journal page par page, puis le rend', async () => {
    // Préparer : un journal de 3 événements servi en deux pages.
    const journal = makeEvents(3);
    const events = jest
      .fn<Promise<EventsPage>, [string, string | null]>()
      .mockResolvedValueOnce({ events: journal.slice(0, 2), nextCursor: 'page-2' })
      .mockResolvedValueOnce({ events: journal.slice(2), nextCursor: null });
    const deps = recoveryDeps(fakeApi({ events }));

    // Agir : code tapé en minuscules, avec des espaces au lieu des tirets.
    const outcome = await recoverAccount('k7qm 3xrp t9wd', deps);

    // Vérifier
    expect(outcome).toBe('restored');
    expect(deps.api.recover).toHaveBeenCalledWith(CODE);
    expect(deps.credentials.current()).toEqual({ userId: 'compte-ancien', secret: SECRET });
    expect(JSON.parse(deps.recoveryCode.current() ?? '{}')).toEqual({
      userId: 'compte-ancien',
      code: CODE,
    });
    expect(deps.forgetToken).toHaveBeenCalled();
    expect(events.mock.calls).toEqual([
      ['jeton-recupere', null],
      ['jeton-recupere', 'page-2'],
    ]);
    expect(deps.restore).toHaveBeenCalledWith(journal, 'Tortue sage');
  });

  it('refuse sans appeler le serveur un texte qui ne peut pas être un code', async () => {
    const deps = recoveryDeps(fakeApi());

    expect(await recoverAccount('K7QM-3XRP', deps)).toBe('invalid');
    expect(deps.api.recover).not.toHaveBeenCalled();
  });

  it('signale un code inconnu sans rien changer sur le téléphone', async () => {
    const deps = recoveryDeps(
      fakeApi({ recover: jest.fn(async () => Promise.reject(new ApiError(401, 'refus'))) }),
    );

    expect(await recoverAccount(CODE, deps)).toBe('unknown');
    expect(deps.credentials.current()).toBeNull();
    expect(deps.restore).not.toHaveBeenCalled();
  });

  it('distingue l’absence de réseau d’un serveur débordé', async () => {
    const offline = recoveryDeps(
      fakeApi({ recover: jest.fn(async () => Promise.reject(new OfflineError('coupé'))) }),
    );
    const busy = recoveryDeps(
      fakeApi({ recover: jest.fn(async () => Promise.reject(new ApiError(429, 'trop'))) }),
    );

    expect(await recoverAccount(CODE, offline)).toBe('offline');
    expect(await recoverAccount(CODE, busy)).toBe('busy');
  });

  it('garde le compte retrouvé même si la copie du journal est coupée', async () => {
    // Le serveur a déjà changé le secret : le perdre rendrait le compte inaccessible.
    const deps = recoveryDeps(
      fakeApi({ events: jest.fn(async () => Promise.reject(new OfflineError('coupé'))) }),
    );

    expect(await recoverAccount(CODE, deps)).toBe('offline');
    expect(deps.credentials.current()).toEqual({ userId: 'compte-ancien', secret: SECRET });
    expect(deps.restore).not.toHaveBeenCalled();
  });
});

describe('affichage du code de récupération', () => {
  const engine = { withAccessToken: <T>(call: (token: string) => Promise<T>) => call('jeton') };

  it('demande un code au serveur la première fois et le garde avec son compte', async () => {
    const api = fakeApi();
    const credentials = memoryCredentials({ userId: 'moi', secret: SECRET });
    const recoveryCode = memoryText();

    const code = await loadRecoveryCode({ api, engine, credentials, recoveryCode });

    expect(code).toBe(CODE);
    expect(api.createRecoveryCode).toHaveBeenCalledWith('jeton');
    expect(JSON.parse(recoveryCode.current() ?? '{}')).toEqual({ userId: 'moi', code: CODE });
  });

  it('réaffiche le code gardé sans appeler le serveur', async () => {
    const api = fakeApi();
    const credentials = memoryCredentials({ userId: 'moi', secret: SECRET });
    const recoveryCode = memoryText(JSON.stringify({ userId: 'moi', code: 'AAAA-BBBB-CCCC' }));

    expect(await loadRecoveryCode({ api, engine, credentials, recoveryCode })).toBe(
      'AAAA-BBBB-CCCC',
    );
    expect(api.createRecoveryCode).not.toHaveBeenCalled();
  });

  it('ne montre pas le code d’un autre compte (compte changé depuis)', async () => {
    const api = fakeApi();
    const credentials = memoryCredentials({ userId: 'nouveau', secret: SECRET });
    const recoveryCode = memoryText(JSON.stringify({ userId: 'ancien', code: 'AAAA-BBBB-CCCC' }));

    expect(await loadRecoveryCode({ api, engine, credentials, recoveryCode })).toBe(CODE);
    expect(api.createRecoveryCode).toHaveBeenCalled();
  });

  it('laisse remonter une panne réseau', async () => {
    const api = fakeApi({
      createRecoveryCode: jest.fn(async () => Promise.reject(new OfflineError('coupé'))),
    });
    const deps = {
      api,
      engine,
      credentials: memoryCredentials({ userId: 'moi', secret: SECRET }),
      recoveryCode: memoryText('abîmé'),
    };

    await expect(loadRecoveryCode(deps)).rejects.toBeInstanceOf(OfflineError);
  });
});

describe('client de l’API : récupération', () => {
  function respond(body: unknown): jest.Mock {
    return jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(
      async () => new Response(JSON.stringify(body), { status: 200 }),
    );
  }

  it('envoie le code et valide le compte rendu', async () => {
    const fetchImpl = respond(RECOVERED);
    const client = createApiClient('https://api', fetchImpl);

    expect(await client.recover(CODE)).toEqual(RECOVERED);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api/v1/auth/recover',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: CODE }) }),
    );
  });

  it('crée un code avec le jeton du compte', async () => {
    const fetchImpl = respond({ code: CODE });
    const client = createApiClient('https://api', fetchImpl);

    expect(await client.createRecoveryCode('jeton')).toBe(CODE);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api/v1/account/recovery-code',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('lit le journal page par page et écarte les événements illisibles', async () => {
    const [valid] = makeEvents(1);
    const fetchImpl = respond({ events: [valid, { type: 'inconnu' }], nextCursor: 'a/b+c' });
    const client = createApiClient('https://api', fetchImpl);

    const page = await client.events('jeton', 'a/b+c');

    expect(page).toEqual({ events: [valid], nextCursor: 'a/b+c' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api/v1/sync/events?cursor=a%2Fb%2Bc',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
