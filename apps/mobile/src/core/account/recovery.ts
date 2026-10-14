import { formatRecoveryCode, normalizeRecoveryCode, type GameEvent } from '@gbe/domain';
import { z } from 'zod';

import { ApiError, OfflineError, type ApiClient } from '../sync/apiClient';
import type { CredentialStore, SecretTextStore } from '../sync/credentialsShared';
import type { SyncEngine } from '../sync/syncEngine';

/**
 * Code de récupération (ADR 0011). Le téléphone garde le code avec l'identifiant du compte
 * auquel il appartient : si le compte change (récupéré ailleurs, supprimé), le code n'est plus montré.
 */
const StoredCodeSchema = z.object({ userId: z.string().min(1), code: z.string().min(12) });

function readStoredCode(raw: string | null): z.infer<typeof StoredCodeSchema> | null {
  if (raw === null) return null;
  try {
    const parsed = StoredCodeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export interface RecoveryCodeDeps {
  api: ApiClient;
  engine: Pick<SyncEngine, 'withAccessToken'>;
  credentials: CredentialStore;
  recoveryCode: SecretTextStore;
}

/**
 * Code de récupération du compte du téléphone : celui déjà gardé, sinon un nouveau demandé
 * au serveur (le compte invité est créé s'il n'existe pas encore). Les erreurs réseau remontent.
 */
export async function loadRecoveryCode(deps: RecoveryCodeDeps): Promise<string> {
  const [credentials, stored] = await Promise.all([
    deps.credentials.load(),
    deps.recoveryCode.load().then(readStoredCode),
  ]);
  if (credentials !== null && stored?.userId === credentials.userId) return stored.code;
  const code = await deps.engine.withAccessToken((token) => deps.api.createRecoveryCode(token));
  // Le compte a pu être créé par l'appel ci-dessus : on relit ses identifiants.
  const owner = await deps.credentials.load();
  if (owner !== null) {
    await deps.recoveryCode.save(JSON.stringify({ userId: owner.userId, code }));
  }
  return code;
}

/**
 * `invalid` : le texte ne peut pas être un code ; `unknown` : aucun compte n'a ce code ;
 * `offline` : pas de réseau ; `busy` : trop d'essais ou serveur en difficulté.
 */
export type RecoveryOutcome = 'restored' | 'invalid' | 'unknown' | 'offline' | 'busy';

export interface RecoveryDeps {
  api: ApiClient;
  credentials: CredentialStore;
  recoveryCode: SecretTextStore;
  /** Le compte du téléphone change : le jeton gardé en mémoire ne vaut plus. */
  forgetToken: () => void;
  /** Remplace la progression du téléphone par le journal du compte retrouvé. */
  restore: (events: readonly GameEvent[], pseudo: string | null) => Promise<void>;
}

/** Garde-fou : au-delà de 100 pages (50 000 événements), le journal reçu est anormal. */
const MAX_PAGES = 100;

/**
 * Retrouve un compte avec son code (écran 14) : le serveur donne un nouveau secret, gardé
 * aussitôt ; puis le journal est recopié page par page et la progression recalculée.
 * Si la copie échoue, l'apprenant peut recommencer : le code reste valable.
 */
export async function recoverAccount(input: string, deps: RecoveryDeps): Promise<RecoveryOutcome> {
  const canonical = normalizeRecoveryCode(input);
  if (canonical === null) return 'invalid';
  const code = formatRecoveryCode(canonical);
  try {
    const account = await deps.api.recover(code);
    // Le serveur vient de remplacer le secret : sans lui, le compte serait perdu pour ce téléphone.
    await deps.credentials.save({ userId: account.userId, secret: account.secret });
    await deps.recoveryCode.save(JSON.stringify({ userId: account.userId, code }));
    deps.forgetToken();

    const journal: GameEvent[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await deps.api.events(account.accessToken, cursor);
      journal.push(...result.events);
      cursor = result.nextCursor;
      if (cursor === null) break;
    }
    await deps.restore(journal, account.pseudo);
    return 'restored';
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return 'unknown';
      if (error.status === 400) return 'invalid';
      return 'busy';
    }
    if (error instanceof OfflineError) return 'offline';
    throw error;
  }
}
