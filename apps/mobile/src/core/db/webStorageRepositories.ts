import { dedupeEvents, type GameEvent } from '@gbe/domain';

import {
  parseStoredEvent,
  settingsFromRaw,
  type Repositories,
  type Settings,
} from './repositories';

/** Sous-ensemble de l'API Storage du navigateur (localStorage), facile à simuler. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PREFIX = 'gbe.v1.';

/**
 * Stockage de repli en mémoire : la progression dure le temps de l'onglet.
 * Utilisé quand le navigateur refuse localStorage (navigation privée, aperçu).
 */
export function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

/** localStorage s'il est disponible et utilisable, sinon la mémoire. */
export function browserStorage(): KeyValueStorage {
  try {
    const storage = globalThis.localStorage;
    const probe = `${PREFIX}probe`;
    storage.setItem(probe, '1');
    return storage;
  } catch {
    return memoryStorage();
  }
}

function safeGet(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function safeSet(storage: KeyValueStorage, key: string, value: string): void {
  try {
    storage.setItem(PREFIX + key, value);
  } catch (error) {
    console.warn('Enregistrement local impossible', error);
  }
}

/**
 * Version web (navigateur) des dépôts : même contrat que la version SQLite.
 * Chaque événement est relu et validé par Zod ; une entrée abîmée est ignorée.
 */
export function createWebStorageRepositories(storage: KeyValueStorage): Repositories {
  const readEvents = (): GameEvent[] => {
    const raw = safeGet(storage, 'events');
    if (raw === null) return [];
    let payloads: unknown;
    try {
      payloads = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(payloads)) return [];
    return payloads
      .filter((p): p is string => typeof p === 'string')
      .map(parseStoredEvent)
      .filter((event): event is GameEvent => event !== null);
  };

  const readSynced = (): Set<string> => {
    const raw = safeGet(storage, 'synced');
    try {
      const ids: unknown = raw === null ? [] : JSON.parse(raw);
      return new Set(
        Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [],
      );
    } catch {
      return new Set();
    }
  };

  return {
    events: {
      async append(events) {
        if (events.length === 0) return;
        const all = dedupeEvents([...readEvents(), ...events]);
        safeSet(storage, 'events', JSON.stringify(all.map((e) => JSON.stringify(e))));
      },
      async all() {
        return dedupeEvents(readEvents());
      },
      async unsynced(limit) {
        const synced = readSynced();
        return dedupeEvents(readEvents())
          .filter((event) => !synced.has(event.id))
          .slice(0, limit);
      },
      async markSynced(ids) {
        if (ids.length === 0) return;
        const synced = readSynced();
        ids.forEach((id) => synced.add(id));
        safeSet(storage, 'synced', JSON.stringify([...synced]));
      },
    },
    settings: {
      async load() {
        return settingsFromRaw(safeGet(storage, 'onboarded'), safeGet(storage, 'dailyGoal'));
      },
      async save(settings: Settings) {
        safeSet(storage, 'onboarded', String(settings.onboarded));
        safeSet(storage, 'dailyGoal', settings.dailyGoal);
      },
    },
  };
}
