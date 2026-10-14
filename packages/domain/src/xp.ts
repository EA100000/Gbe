/**
 * XP et précision. Valeurs provisoires, à confirmer (voir docs/adr/0003-regles-du-jeu.md).
 * Avec ces valeurs, l'écran de fin de la maquette (+15 XP, 90 %) est cohérent.
 */
export const LESSON_XP = 10;
export const ACCURACY_BONUS_XP = 5;
export const ACCURACY_BONUS_THRESHOLD = 0.8;

/** Part des exercices réussis du premier coup, entre 0 et 1. */
export function computeAccuracy(firstTryCorrect: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, firstTryCorrect / total));
}

/** XP d'une leçon terminée : une base, plus un bonus si la précision est bonne. */
export function lessonXp(accuracy: number): number {
  return LESSON_XP + (accuracy >= ACCURACY_BONUS_THRESHOLD ? ACCURACY_BONUS_XP : 0);
}
