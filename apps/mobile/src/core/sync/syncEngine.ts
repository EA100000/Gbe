import type { EventRepository } from '../db/repositories';
import { ApiError, OfflineError, type ApiClient } from './apiClient';
import type { CredentialStore } from './credentialsShared';

/** Taille des lots envoyés (le serveur en accepte jusqu'à 500). */
export const SYNC_BATCH = 200;

export type SyncOutcome =
  { status: 'synced'; sent: number } | { status: 'offline' } | { status: 'error'; message: string };

export interface SyncEngine {
  /** Envoie au serveur les événements pas encore synchronisés. Un seul envoi à la fois. */
  sync(): Promise<SyncOutcome>;
  /**
   * Appelle le serveur au nom du compte invité (créé s'il n'existe pas encore).
   * Un jeton refusé est renouvelé une fois. Les erreurs (hors-ligne…) remontent à l'appelant.
   */
  withAccessToken<T>(call: (accessToken: string) => Promise<T>): Promise<T>;
}

interface Deps {
  api: ApiClient;
  credentials: CredentialStore;
  events: EventRepository;
  now: () => number;
}

/**
 * Synchronisation du journal. Le téléphone reste la source de vérité :
 * hors-ligne, rien ne change pour l'apprenant ; les événements partent au prochain réseau.
 * Le compte invité est créé au premier envoi, sans écran ni donnée personnelle.
 */
export function createSyncEngine({ api, credentials, events, now }: Deps): SyncEngine {
  let token: { value: string; expiresAt: number } | null = null;
  let inFlight: Promise<SyncOutcome> | null = null;

  async function account() {
    const saved = await credentials.load();
    if (saved !== null) return saved;
    const guest = await api.createGuest();
    const created = { userId: guest.userId, secret: guest.secret };
    await credentials.save(created);
    token = { value: guest.accessToken, expiresAt: now() + guest.expiresIn * 1000 };
    return created;
  }

  async function accessToken(): Promise<string> {
    const creds = await account();
    // Marge d'une minute avant l'expiration du jeton.
    if (token !== null && token.expiresAt - 60_000 > now()) return token.value;
    try {
      const fresh = await api.token(creds.userId, creds.secret);
      token = { value: fresh.accessToken, expiresAt: now() + fresh.expiresIn * 1000 };
      return fresh.accessToken;
    } catch (error) {
      // Compte supprimé ou secret refusé : on repartira d'un nouveau compte invité.
      if (error instanceof ApiError && error.status === 401) await credentials.clear();
      throw error;
    }
  }

  async function run(): Promise<SyncOutcome> {
    let sent = 0;
    let retriedAuth = false;
    for (;;) {
      const batch = await events.unsynced(SYNC_BATCH);
      if (batch.length === 0) return { status: 'synced', sent };
      try {
        await api.sendEvents(await accessToken(), batch);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && !retriedAuth) {
          token = null;
          retriedAuth = true;
          continue;
        }
        throw error;
      }
      await events.markSynced(batch.map((e) => e.id));
      sent += batch.length;
    }
  }

  async function withAccessToken<T>(call: (accessToken: string) => Promise<T>): Promise<T> {
    try {
      return await call(await accessToken());
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
      token = null;
      return call(await accessToken());
    }
  }

  return {
    withAccessToken,
    sync() {
      inFlight ??= run()
        .catch((error: unknown): SyncOutcome => {
          if (error instanceof OfflineError) return { status: 'offline' };
          return {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          };
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
  };
}
