import type { GameEvent } from '@gbe/domain';

import type { Clock } from '../core/clock';
import { loadContent, type LoadedContent } from '../core/content/content';
import { useContentStore } from '../core/content/contentStore';
import type { Database } from '../core/db/database';
import { createEventRepository, createSettingsRepository } from '../core/db/repositories';
import { useProgressStore } from '../core/progress/progressStore';
import { bundledPacks } from '../content/bundled-packs.generated';

/** Horloge figée et réglable : aucun test ne dépend de l'heure réelle. */
export function fakeClock(
  start = Date.UTC(2026, 9, 13, 9, 0),
): Clock & { advance: (ms: number) => void } {
  let current = start;
  return {
    now: () => current,
    utcOffsetMinutes: () => 60,
    advance: (ms) => {
      current += ms;
    },
  };
}

/** Pack de test du dépôt, validé comme dans l'appli. */
export function testContent(): LoadedContent {
  const first = bundledPacks[0];
  if (first === undefined) throw new Error('Aucun pack embarqué');
  const result = loadContent(first.pack, first.audio);
  if (!result.ok) throw new Error(`Pack de test invalide : ${JSON.stringify(result.issues)}`);
  return result.content;
}

/** Base SQLite simulée en mémoire, limitée aux requêtes des dépôts. */
export function memoryDatabase(): Database & {
  rows: { id: string; at: number; payload: string; synced?: boolean }[];
} {
  const rows: { id: string; at: number; payload: string; synced?: boolean }[] = [];
  const settings = new Map<string, string>();
  return {
    rows,
    execAsync: async () => undefined,
    withTransactionAsync: async (task) => task(),
    runAsync: async (source, ...params) => {
      if (source.startsWith('INSERT OR IGNORE INTO events')) {
        const [id, , at, payload] = params as [string, string, number, string];
        if (!rows.some((r) => r.id === id)) rows.push({ id, at, payload });
      } else if (source.startsWith('UPDATE events SET synced = 1')) {
        for (const row of rows) if (params.includes(row.id)) row.synced = true;
      } else if (source.startsWith('INSERT INTO settings')) {
        const [key, value] = params as [string, string];
        settings.set(key, value);
      } else if (source === 'DELETE FROM events') {
        rows.splice(0, rows.length);
      } else if (source === 'DELETE FROM settings') {
        settings.clear();
      } else if (source.startsWith('DELETE FROM settings WHERE key')) {
        settings.delete(String(params[0]));
      }
      return undefined;
    },
    getAllAsync: async <T>(source: string, ...params: (string | number | null)[]) => {
      const sorted = [...rows].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
      const selected = source.includes('synced = 0')
        ? sorted.filter((r) => r.synced !== true).slice(0, Number(params[0]))
        : sorted;
      return selected.map((r) => ({ payload: r.payload })) as T[];
    },
    getFirstAsync: async <T>(_source: string, ...params: (string | number | null)[]) => {
      const value = settings.get(String(params[0]));
      return (value === undefined ? null : { value }) as T | null;
    },
  };
}

/** Prépare les deux magasins (contenu et progression) comme au démarrage de l'appli. */
export async function setupStores(options: { events?: GameEvent[]; clock?: Clock } = {}) {
  const db = memoryDatabase();
  const events = createEventRepository(db);
  if (options.events !== undefined) await events.append(options.events);
  useContentStore.setState({ status: 'ready', content: testContent() });
  await useProgressStore
    .getState()
    .hydrate({ events, settings: createSettingsRepository(db) }, options.clock ?? fakeClock());
  return { db };
}
