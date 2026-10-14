import { addDays, type DayKey } from './days';

/**
 * Rappel quotidien (écran 15, ADR 0012). Notifications locales, programmées à l'avance par
 * le téléphone : aucune donnée ne part vers un serveur.
 */

/** Heures proposées par l'écran 15 : matin, midi, soir, nuit. */
export const REMINDER_PRESET_HOURS = [7, 12, 19, 21] as const;
/** « Autre heure… » : heures entières de 6 h à 23 h. */
export const REMINDER_HOURS: readonly number[] = Array.from({ length: 18 }, (_, i) => i + 6);
export const DEFAULT_REMINDER_HOUR = 19;
/** Jours programmés d'avance ; tout est reprogrammé à chaque ouverture de l'appli et après chaque leçon. */
export const REMINDER_HORIZON_DAYS = 7;

export function isReminderHour(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 23;
}

export interface PlannedReminder {
  dayKey: DayKey;
  /** Série à citer dans le message ; `null` : message général (série rompue ou incertaine). */
  streak: number | null;
}

export interface ReminderPlanInput {
  today: DayKey;
  /** Minutes écoulées depuis minuit, heure locale. */
  minutesNow: number;
  hour: number;
  /** Objectif du jour déjà atteint : pas de rappel aujourd'hui. */
  goalReachedToday: boolean;
  /** Au moins une leçon aujourd'hui (la série tiendra jusqu'à demain). */
  activeToday: boolean;
  /** Série en cours (0 si rompue). */
  streak: number;
  horizonDays?: number;
}

/**
 * Jours où rappeler, et quoi dire. Aujourd'hui seulement si l'heure n'est pas passée et
 * l'objectif pas atteint. La série n'est citée que tant qu'elle est sûre de tenir :
 * aujourd'hui, et demain si l'apprenant a déjà joué aujourd'hui.
 */
export function planReminders(input: ReminderPlanInput): PlannedReminder[] {
  const horizon = input.horizonDays ?? REMINDER_HORIZON_DAYS;
  const at = input.hour * 60;
  const plan: PlannedReminder[] = [];
  for (let offset = 0; offset < horizon; offset += 1) {
    if (offset === 0 && (input.goalReachedToday || input.minutesNow >= at)) continue;
    const streakHolds = input.streak > 0 && (offset === 0 || (offset === 1 && input.activeToday));
    plan.push({ dayKey: addDays(input.today, offset), streak: streakHolds ? input.streak : null });
  }
  return plan;
}

/**
 * Instant (ms) d'une heure locale d'un jour donné. `utcOffsetMinutes` donne le décalage du
 * téléphone à un instant : on le relit à l'instant visé pour suivre les changements d'heure.
 */
export function localTimeToEpoch(
  day: DayKey,
  hour: number,
  utcOffsetMinutes: (at: number) => number,
): number {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, date, hour);
  const guess = wallClock - utcOffsetMinutes(wallClock) * 60_000;
  return wallClock - utcOffsetMinutes(guess) * 60_000;
}

/** Minutes écoulées depuis minuit, heure locale. */
export function localMinutes(at: number, utcOffsetMinutes: number): number {
  const day = 24 * 60;
  return (((Math.floor(at / 60_000) + utcOffsetMinutes) % day) + day) % day;
}
