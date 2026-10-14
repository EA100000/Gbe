import { ApiError, type ApiClient } from '../sync/apiClient';
import type { CredentialStore, GuestCredentials } from '../sync/credentialsShared';

export interface AccountDeletionDeps {
  /** `null` quand aucune API n'est configurée : il n'y a alors rien sur un serveur. */
  api: ApiClient | null;
  credentials: CredentialStore;
  /** Suppression à terminer sur le serveur dès que le réseau revient. */
  pendingDeletion: CredentialStore;
  /** Efface toute la progression du téléphone (journal, réglages). */
  resetLocal: () => Promise<void>;
}

/** `pending` : effacé du téléphone, le serveur le sera au prochain réseau. */
export type DeletionOutcome = 'deleted' | 'pending';

async function deleteOnServer(api: ApiClient, credentials: GuestCredentials): Promise<boolean> {
  try {
    const { accessToken } = await api.token(credentials.userId, credentials.secret);
    await api.deleteAccount(accessToken);
    return true;
  } catch (error) {
    // 401 : le serveur ne connaît plus ce compte, il n'y a plus rien à supprimer.
    return error instanceof ApiError && error.status === 401;
  }
}

/**
 * Supprime le compte (exigence de Google Play) : sur le serveur quand c'est possible, puis
 * toutes les données du téléphone. Hors-ligne, l'effacement local a lieu tout de suite et la
 * suppression sur le serveur est retentée à chaque synchronisation, jusqu'à réussir.
 */
export async function deleteAccount(deps: AccountDeletionDeps): Promise<DeletionOutcome> {
  const credentials = await deps.credentials.load();
  let outcome: DeletionOutcome = 'deleted';
  if (credentials !== null) {
    const done = deps.api !== null && (await deleteOnServer(deps.api, credentials));
    if (!done) {
      await deps.pendingDeletion.save(credentials);
      outcome = 'pending';
    }
  }
  await deps.credentials.clear();
  await deps.resetLocal();
  return outcome;
}

/** Termine une suppression restée en attente (appelée avant chaque synchronisation). */
export async function retryPendingDeletion(
  deps: Pick<AccountDeletionDeps, 'api' | 'pendingDeletion'>,
): Promise<void> {
  const credentials = await deps.pendingDeletion.load();
  if (credentials === null || deps.api === null) return;
  if (await deleteOnServer(deps.api, credentials)) await deps.pendingDeletion.clear();
}
