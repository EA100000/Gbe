import { ApiError, OfflineError, type ApiClient } from '../sync/apiClient';
import type { CredentialStore, GuestCredentials } from '../sync/credentialsShared';
import { deleteAccount, retryPendingDeletion } from './accountDeletion';

const ACCOUNT: GuestCredentials = { userId: 'user-1', secret: 's'.repeat(43) };

function memoryStore(initial: GuestCredentials | null = null) {
  let value = initial;
  const store: CredentialStore & { current: () => GuestCredentials | null } = {
    load: async () => value,
    save: async (c) => {
      value = c;
    },
    clear: async () => {
      value = null;
    },
    current: () => value,
  };
  return store;
}

function fakeApi(deleteImpl: () => Promise<void> = async () => undefined) {
  const api: ApiClient & { deleteAccount: jest.Mock; token: jest.Mock } = {
    createGuest: jest.fn(),
    token: jest.fn(async () => ({ accessToken: 'jeton', expiresIn: 3600 })),
    sendEvents: jest.fn(),
    deleteAccount: jest.fn(deleteImpl),
    setPseudo: jest.fn(),
    league: jest.fn(),
    createRecoveryCode: jest.fn(),
    recover: jest.fn(),
    events: jest.fn(),
  };
  return api;
}

describe('suppression du compte', () => {
  it('supprime le compte sur le serveur puis efface le téléphone', async () => {
    // Préparer
    const api = fakeApi();
    const credentials = memoryStore(ACCOUNT);
    const pendingDeletion = memoryStore();
    const resetLocal = jest.fn(async () => undefined);
    // Agir
    const outcome = await deleteAccount({ api, credentials, pendingDeletion, resetLocal });
    // Vérifier
    expect(outcome).toBe('deleted');
    expect(api.token).toHaveBeenCalledWith('user-1', ACCOUNT.secret);
    expect(api.deleteAccount).toHaveBeenCalledWith('jeton');
    expect(credentials.current()).toBeNull();
    expect(pendingDeletion.current()).toBeNull();
    expect(resetLocal).toHaveBeenCalled();
  });

  it('efface le téléphone tout de suite et garde la suppression serveur pour plus tard hors-ligne', async () => {
    const api = fakeApi(async () => {
      throw new OfflineError(new TypeError('Network request failed'));
    });
    const credentials = memoryStore(ACCOUNT);
    const pendingDeletion = memoryStore();
    const resetLocal = jest.fn(async () => undefined);

    const outcome = await deleteAccount({ api, credentials, pendingDeletion, resetLocal });

    expect(outcome).toBe('pending');
    expect(credentials.current()).toBeNull();
    expect(pendingDeletion.current()).toEqual(ACCOUNT);
    expect(resetLocal).toHaveBeenCalled();
  });

  it('considère comme supprimé un compte que le serveur ne connaît plus', async () => {
    const api = fakeApi();
    api.token.mockRejectedValue(new ApiError(401, 'Identifiants invalides'));
    const pendingDeletion = memoryStore();

    const outcome = await deleteAccount({
      api,
      credentials: memoryStore(ACCOUNT),
      pendingDeletion,
      resetLocal: async () => undefined,
    });

    expect(outcome).toBe('deleted');
    expect(pendingDeletion.current()).toBeNull();
  });

  it('n’appelle pas le serveur quand aucun compte n’a encore été créé', async () => {
    const api = fakeApi();

    const outcome = await deleteAccount({
      api,
      credentials: memoryStore(),
      pendingDeletion: memoryStore(),
      resetLocal: async () => undefined,
    });

    expect(outcome).toBe('deleted');
    expect(api.token).not.toHaveBeenCalled();
  });

  it('termine une suppression en attente dès que le serveur répond', async () => {
    const api = fakeApi();
    const pendingDeletion = memoryStore(ACCOUNT);

    await retryPendingDeletion({ api, pendingDeletion });

    expect(api.deleteAccount).toHaveBeenCalledWith('jeton');
    expect(pendingDeletion.current()).toBeNull();
  });

  it('garde la suppression en attente tant que le serveur est injoignable', async () => {
    const api = fakeApi(async () => {
      throw new ApiError(503, 'indisponible');
    });
    const pendingDeletion = memoryStore(ACCOUNT);

    await retryPendingDeletion({ api, pendingDeletion });

    expect(pendingDeletion.current()).toEqual(ACCOUNT);
  });
});
