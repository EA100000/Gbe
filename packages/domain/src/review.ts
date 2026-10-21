import { dedupeEvents, type GameEvent } from './events';

/**
 * Réviser (écran 24, ADR 0019) : « Mes erreurs » et les mots à consolider, à partir du premier
 * essai de chaque réponse (événements `item_answered`). Règles provisoires, à affiner avec l'usage.
 */

/** Nombre de réponses récentes prises en compte pour la maîtrise d'un mot (0 à 4). */
export const MASTERY_WINDOW = 4;

/** Mots et phrases proposés au plus dans une séance de révision. */
export const REVIEW_SIZE = 8;

/** Durée moyenne d'un exercice d'entraînement, pour annoncer « environ N min ». */
export const SECONDS_PER_EXERCISE = 20;

export interface ItemStat {
  /** Clé unique dans tout le cours : `<unité>:<élément>`. */
  key: string;
  unitId: string;
  itemId: string;
  /** Derniers premiers essais, du plus ancien au plus récent (vrai = juste). */
  recent: readonly boolean[];
  lastAt: number;
  /**
   * Erreur pas encore corrigée : posée par une réponse fausse, levée seulement par une réponse juste
   * en révision ou en écoute (réussir le même mot juste après, dans la leçon, ne suffit pas).
   */
  pendingMistake: boolean;
  /** Date de la dernière erreur, pour ranger « Mes erreurs » (0 sans erreur). */
  mistakeAt: number;
}

export const itemKey = (unitId: string, itemId: string): string => `${unitId}:${itemId}`;

/** Historique récent de chaque mot ou phrase déjà rencontré. Un événement en double compte une fois. */
export function itemStats(events: Iterable<GameEvent>): Map<string, ItemStat> {
  const stats = new Map<string, ItemStat>();
  for (const event of dedupeEvents(events)) {
    if (event.type !== 'item_answered') continue;
    const key = itemKey(event.unitId, event.itemId);
    const previous = stats.get(key);
    const recent = [...(previous?.recent ?? []), event.correct].slice(-MASTERY_WINDOW);
    const fixes = event.correct && event.mode !== 'lesson';
    stats.set(key, {
      key,
      unitId: event.unitId,
      itemId: event.itemId,
      recent,
      lastAt: event.at,
      pendingMistake: event.correct ? (previous?.pendingMistake ?? false) && !fixes : true,
      mistakeAt: event.correct ? (previous?.mistakeAt ?? 0) : event.at,
    });
  }
  return stats;
}

/** Maîtrise : réponses justes parmi les quatre dernières, de 0 à 4. */
export function masteryOf(stat: ItemStat): number {
  return stat.recent.filter(Boolean).length;
}

/** Une erreur sur ce mot attend d'être corrigée en révision ou en écoute. */
export function needsReview(stat: ItemStat): boolean {
  return stat.pendingMistake;
}

/** « Mes erreurs » : les erreurs pas encore corrigées, les plus récentes d'abord. */
export function mistakesToReview(stats: Iterable<ItemStat>): ItemStat[] {
  return [...stats].filter(needsReview).sort((a, b) => b.mistakeAt - a.mistakeAt);
}

/** « Mots à consolider » : maîtrise incomplète, la plus faible d'abord, puis le plus ancien. */
export function itemsToStrengthen(stats: Iterable<ItemStat>, limit: number): ItemStat[] {
  return [...stats]
    .filter((s) => masteryOf(s) < MASTERY_WINDOW)
    .sort((a, b) => masteryOf(a) - masteryOf(b) || a.lastAt - b.lastAt)
    .slice(0, limit);
}

/** Mots d'une séance de révision : les erreurs d'abord, puis les mots les plus fragiles. */
export function pickReviewItems(stats: Iterable<ItemStat>, max = REVIEW_SIZE): ItemStat[] {
  const all = [...stats];
  const picked = mistakesToReview(all);
  const keys = new Set(picked.map((s) => s.key));
  for (const stat of itemsToStrengthen(all, all.length)) {
    if (!keys.has(stat.key)) picked.push(stat);
  }
  return picked.slice(0, max);
}

/** Durée annoncée d'une séance, en minutes entières (au moins 1). */
export function practiceMinutes(exerciseCount: number): number {
  return Math.max(1, Math.ceil((exerciseCount * SECONDS_PER_EXERCISE) / 60));
}
