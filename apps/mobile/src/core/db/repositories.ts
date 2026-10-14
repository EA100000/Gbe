import {
  DEFAULT_DAILY_GOAL,
  isDailyGoalId,
  parseGameEvent,
  type DailyGoalId,
  type GameEvent,
} from '@gbe/domain';

import type { Database } from './database';

/** Journal des événements de jeu. Insérer deux fois le même événement ne change rien. */
export interface EventRepository {
  append(events: readonly GameEvent[]): Promise<void>;
  /** Relit le journal ; une entrée illisible (stockage abîmé) est ignorée, jamais devinée. */
  all(): Promise<GameEvent[]>;
  /** Événements pas encore envoyés au serveur, les plus anciens d'abord. */
  unsynced(limit: number): Promise<GameEvent[]>;
  /** Marque des événements comme reçus par le serveur. */
  markSynced(ids: readonly string[]): Promise<void>;
}

export interface Settings {
  onboarded: boolean;
  dailyGoal: DailyGoalId;
}

export const DEFAULT_SETTINGS: Settings = { onboarded: false, dailyGoal: DEFAULT_DAILY_GOAL };

/** Réglages de l'apprenant, validés à la lecture. */
export interface SettingsRepository {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

export interface Repositories {
  events: EventRepository;
  settings: SettingsRepository;
}

/** Lit un événement stocké en JSON ; `null` si le texte ou l'objet est invalide. */
export function parseStoredEvent(payload: string): GameEvent | null {
  try {
    return parseGameEvent(JSON.parse(payload));
  } catch {
    return null;
  }
}

/** Réglages relus depuis des valeurs brutes, avec repli sur les valeurs par défaut. */
export function settingsFromRaw(onboarded: string | null, goal: string | null): Settings {
  return {
    onboarded: onboarded === 'true',
    dailyGoal: goal !== null && isDailyGoalId(goal) ? goal : DEFAULT_SETTINGS.dailyGoal,
  };
}

/** Version SQLite (Android, iOS). */
export function createEventRepository(db: Database): EventRepository {
  return {
    async append(events: readonly GameEvent[]): Promise<void> {
      if (events.length === 0) return;
      await db.withTransactionAsync(async () => {
        for (const event of events) {
          await db.runAsync(
            'INSERT OR IGNORE INTO events (id, type, at, payload) VALUES (?, ?, ?, ?)',
            event.id,
            event.type,
            event.at,
            JSON.stringify(event),
          );
        }
      });
    },

    async all(): Promise<GameEvent[]> {
      const rows = await db.getAllAsync<{ payload: string }>(
        'SELECT payload FROM events ORDER BY at, id',
      );
      return rows
        .map((row) => parseStoredEvent(row.payload))
        .filter((event): event is GameEvent => event !== null);
    },

    async unsynced(limit: number): Promise<GameEvent[]> {
      const rows = await db.getAllAsync<{ payload: string }>(
        'SELECT payload FROM events WHERE synced = 0 ORDER BY at, id LIMIT ?',
        limit,
      );
      return rows
        .map((row) => parseStoredEvent(row.payload))
        .filter((event): event is GameEvent => event !== null);
    },

    async markSynced(ids: readonly string[]): Promise<void> {
      if (ids.length === 0) return;
      const placeholders = ids.map(() => '?').join(', ');
      await db.runAsync(`UPDATE events SET synced = 1 WHERE id IN (${placeholders})`, ...ids);
    },
  };
}

/** Version SQLite (Android, iOS). */
export function createSettingsRepository(db: Database): SettingsRepository {
  const read = async (key: string) =>
    (await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key))
      ?.value ?? null;
  const write = (key: string, value: string) =>
    db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );

  return {
    async load(): Promise<Settings> {
      const [onboarded, goal] = await Promise.all([read('onboarded'), read('dailyGoal')]);
      return settingsFromRaw(onboarded, goal);
    },
    async save(settings: Settings): Promise<void> {
      await db.withTransactionAsync(async () => {
        await write('onboarded', String(settings.onboarded));
        await write('dailyGoal', settings.dailyGoal);
      });
    },
  };
}
