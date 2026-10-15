import {
  DEFAULT_DAILY_GOAL,
  DEFAULT_REMINDER_HOUR,
  isReminderHour,
  isDailyGoalId,
  isLearningReason,
  isSelfLevel,
  isValidPseudo,
  parseGameEvent,
  type DailyGoalId,
  type GameEvent,
  type LearningReason,
  type SelfLevel,
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
  /** Efface tout le journal (suppression du compte). */
  clear(): Promise<void>;
}

export interface Settings {
  onboarded: boolean;
  dailyGoal: DailyGoalId;
  /** Nom affiché dans la Ligue, tiré au hasard (jamais saisi) ; `null` avant le premier tirage. */
  pseudo: string | null;
  /** Rappel quotidien (écran 15) : notification locale à l'heure choisie. */
  reminder: { enabled: boolean; hour: number };
  /** Le rappel a déjà été proposé après la première leçon (on ne le propose qu'une fois). */
  reminderOffered: boolean;
  /** Réponses du démarrage (écrans 1a et 1b), gardées sur le téléphone ; `null` sans réponse. */
  learningReason: LearningReason | null;
  selfLevel: SelfLevel | null;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  dailyGoal: DEFAULT_DAILY_GOAL,
  pseudo: null,
  reminder: { enabled: false, hour: DEFAULT_REMINDER_HOUR },
  reminderOffered: false,
  learningReason: null,
  selfLevel: null,
};

/** Clés des réglages dans le stockage (SQLite ou navigateur). */
export const SETTING_KEYS = [
  'onboarded',
  'dailyGoal',
  'pseudo',
  'reminderEnabled',
  'reminderHour',
  'reminderOffered',
  'learningReason',
  'selfLevel',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/** Valeurs à écrire pour des réglages ; `null` : clé à effacer. */
export function settingsToRaw(settings: Settings): Record<SettingKey, string | null> {
  return {
    onboarded: String(settings.onboarded),
    dailyGoal: settings.dailyGoal,
    pseudo: settings.pseudo,
    reminderEnabled: String(settings.reminder.enabled),
    reminderHour: String(settings.reminder.hour),
    reminderOffered: String(settings.reminderOffered),
    learningReason: settings.learningReason,
    selfLevel: settings.selfLevel,
  };
}

/** Réglages de l'apprenant, validés à la lecture. */
export interface SettingsRepository {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
  /** Revient aux réglages du premier lancement (suppression du compte). */
  clear(): Promise<void>;
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
export function settingsFromRaw(raw: Partial<Record<SettingKey, string | null>>): Settings {
  const goal = raw.dailyGoal ?? null;
  const pseudo = raw.pseudo ?? null;
  const hour = Number(raw.reminderHour ?? Number.NaN);
  return {
    onboarded: raw.onboarded === 'true',
    dailyGoal: goal !== null && isDailyGoalId(goal) ? goal : DEFAULT_SETTINGS.dailyGoal,
    pseudo: isValidPseudo(pseudo) ? pseudo.normalize('NFC') : null,
    reminder: {
      enabled: raw.reminderEnabled === 'true',
      hour: isReminderHour(hour) ? hour : DEFAULT_REMINDER_HOUR,
    },
    reminderOffered: raw.reminderOffered === 'true',
    learningReason: isLearningReason(raw.learningReason) ? raw.learningReason : null,
    selfLevel: isSelfLevel(raw.selfLevel) ? raw.selfLevel : null,
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

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM events');
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
      const values = await Promise.all(SETTING_KEYS.map(read));
      return settingsFromRaw(Object.fromEntries(SETTING_KEYS.map((key, i) => [key, values[i]])));
    },
    async save(settings: Settings): Promise<void> {
      const raw = settingsToRaw(settings);
      await db.withTransactionAsync(async () => {
        for (const key of SETTING_KEYS) {
          const value = raw[key];
          if (value !== null) await write(key, value);
          else await db.runAsync('DELETE FROM settings WHERE key = ?', key);
        }
      });
    },
    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM settings');
    },
  };
}
