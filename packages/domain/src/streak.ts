import { addDays, type DayKey } from './days';

export interface StreakStatus {
  /** Nombre de jours consécutifs avec au moins une leçon terminée. */
  current: number;
  /** Vrai si une leçon a déjà été terminée aujourd'hui. */
  activeToday: boolean;
}

/**
 * Série de jours. Elle reste allumée tant qu'hier a été joué :
 * l'apprenant a jusqu'à la fin d'aujourd'hui pour la prolonger.
 * Les jours postérieurs à `today` (horloge déréglée) sont ignorés.
 */
export function computeStreak(activeDays: Iterable<DayKey>, today: DayKey): StreakStatus {
  const days = new Set(activeDays);
  const activeToday = days.has(today);
  let cursor = activeToday ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, activeToday };
}
