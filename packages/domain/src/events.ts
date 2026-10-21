import { z } from 'zod';

import { isDayKey, type DayKey } from './days';

/**
 * Journal des événements de jeu.
 *
 * Le téléphone fait foi pendant la leçon : chaque fait (leçon terminée, vie perdue,
 * calebasse ouverte) devient un événement à identifiant unique. Rejouer le journal,
 * même avec des doublons, donne toujours le même résultat.
 */
const DayKeySchema = z.string().refine(isDayKey, { error: 'Jour invalide' });

const base = {
  id: z.string().min(1),
  at: z.number().int().nonnegative(),
  dayKey: DayKeySchema,
};

export const LessonCompletedSchema = z.object({
  ...base,
  type: z.literal('lesson_completed'),
  lessonId: z.string().min(1),
  unitId: z.string().min(1),
  packId: z.string().min(1),
  packVersion: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  durationMs: z.number().int().nonnegative(),
});

export const HeartLostSchema = z.object({
  ...base,
  type: z.literal('heart_lost'),
  lessonId: z.string().min(1),
});

export const ChestOpenedSchema = z.object({
  ...base,
  type: z.literal('chest_opened'),
  chestId: z.string().min(1),
  cauris: z.number().int().nonnegative(),
});

/** Où l'apprenant a répondu : leçon du chemin, révision ou écoute (ADR 0019). */
export const AnswerModeSchema = z.enum(['lesson', 'review', 'listen']);
export type AnswerMode = z.infer<typeof AnswerModeSchema>;

/**
 * Premier essai sur un mot ou une phrase du lexique : juste ou faux.
 * Base de « Mes erreurs » et de la maîtrise des mots (ADR 0019).
 */
export const ItemAnsweredSchema = z.object({
  ...base,
  type: z.literal('item_answered'),
  unitId: z.string().min(1),
  itemId: z.string().min(1),
  correct: z.boolean(),
  mode: AnswerModeSchema,
});

/** Fin d'une séance d'entraînement : elle compte pour l'XP et la série, pas pour le chemin. */
export const PracticeCompletedSchema = z.object({
  ...base,
  type: z.literal('practice_completed'),
  mode: AnswerModeSchema.exclude(['lesson']),
  xp: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  durationMs: z.number().int().nonnegative(),
});

export const GameEventSchema = z.discriminatedUnion('type', [
  LessonCompletedSchema,
  HeartLostSchema,
  ChestOpenedSchema,
  ItemAnsweredSchema,
  PracticeCompletedSchema,
]);

export type GameEvent = z.infer<typeof GameEventSchema>;
export type LessonCompletedEvent = z.infer<typeof LessonCompletedSchema>;
export type HeartLostEvent = z.infer<typeof HeartLostSchema>;
export type ChestOpenedEvent = z.infer<typeof ChestOpenedSchema>;
export type ItemAnsweredEvent = z.infer<typeof ItemAnsweredSchema>;
export type PracticeCompletedEvent = z.infer<typeof PracticeCompletedSchema>;

export interface Progress {
  totalXp: number;
  cauris: number;
  completedLessons: ReadonlySet<string>;
  openedChests: ReadonlySet<string>;
  /** Jours avec au moins une leçon terminée (base de la série). */
  activeDays: ReadonlySet<DayKey>;
  xpByDay: ReadonlyMap<DayKey, number>;
  practiceMsByDay: ReadonlyMap<DayKey, number>;
  heartLossTimes: readonly number[];
}

/** Garde la première occurrence de chaque identifiant, puis trie par date. */
export function dedupeEvents(events: Iterable<GameEvent>): GameEvent[] {
  const byId = new Map<string, GameEvent>();
  for (const event of events) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}

const add = (map: Map<DayKey, number>, key: DayKey, value: number) =>
  map.set(key, (map.get(key) ?? 0) + value);

/** Calcule la progression à partir du journal. Un événement reçu deux fois compte une fois. */
export function applyEvents(events: Iterable<GameEvent>): Progress {
  let totalXp = 0;
  let cauris = 0;
  const completedLessons = new Set<string>();
  const openedChests = new Set<string>();
  const activeDays = new Set<DayKey>();
  const xpByDay = new Map<DayKey, number>();
  const practiceMsByDay = new Map<DayKey, number>();
  const heartLossTimes: number[] = [];

  for (const event of dedupeEvents(events)) {
    switch (event.type) {
      case 'lesson_completed':
        totalXp += event.xp;
        completedLessons.add(event.lessonId);
        activeDays.add(event.dayKey);
        add(xpByDay, event.dayKey, event.xp);
        add(practiceMsByDay, event.dayKey, event.durationMs);
        break;
      case 'practice_completed':
        totalXp += event.xp;
        activeDays.add(event.dayKey);
        add(xpByDay, event.dayKey, event.xp);
        add(practiceMsByDay, event.dayKey, event.durationMs);
        break;
      case 'heart_lost':
        heartLossTimes.push(event.at);
        break;
      case 'item_answered':
        // Lu par les règles de révision (review.ts), sans effet sur la progression.
        break;
      case 'chest_opened':
        if (!openedChests.has(event.chestId)) {
          openedChests.add(event.chestId);
          cauris += event.cauris;
        }
        break;
    }
  }

  return {
    totalXp,
    cauris,
    completedLessons,
    openedChests,
    activeDays,
    xpByDay,
    practiceMsByDay,
    heartLossTimes,
  };
}

/** Lit un événement venu du stockage local ou du réseau ; `null` s'il est invalide. */
export function parseGameEvent(input: unknown): GameEvent | null {
  const parsed = GameEventSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
