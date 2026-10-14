/** Objectifs quotidiens proposés à l'accueil (écran 1 de la maquette), en minutes. */
const GOAL_MINUTES = {
  relaxed: 5,
  regular: 10,
  serious: 15,
  intense: 20,
} as const;

export type DailyGoalId = keyof typeof GOAL_MINUTES;

/** Objectifs dans l'ordre d'affichage, avec leur niveau (1 à 4 barres). */
export const DAILY_GOALS: readonly { id: DailyGoalId; minutes: number; level: number }[] = (
  Object.keys(GOAL_MINUTES) as DailyGoalId[]
).map((id, i) => ({ id, minutes: GOAL_MINUTES[id], level: i + 1 }));

export const DEFAULT_DAILY_GOAL: DailyGoalId = 'regular';

export function isDailyGoalId(value: string): value is DailyGoalId {
  return Object.hasOwn(GOAL_MINUTES, value);
}

export function goalMinutes(goal: DailyGoalId): number {
  return GOAL_MINUTES[goal];
}

/** Avancement de l'objectif du jour, à partir du temps passé en leçon. */
export function dailyGoalProgress(
  practiceMs: number,
  goal: DailyGoalId,
): { ratio: number; reached: boolean } {
  const target = goalMinutes(goal) * 60_000;
  const ratio = Math.min(1, Math.max(0, practiceMs) / target);
  return { ratio, reached: ratio >= 1 };
}
