/**
 * Jours calendaires de l'apprenant, sous la forme « AAAA-MM-JJ ».
 *
 * La clé du jour est calculée au moment de l'événement, avec le décalage horaire
 * du téléphone à cet instant. Un voyage ou un changement d'heure ne réécrit donc
 * jamais les jours déjà joués.
 */
export type DayKey = string;

const DAY_MS = 86_400_000;
const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Jour local d'un instant, pour un décalage UTC donné en minutes (Bénin : +60). */
export function toDayKey(epochMs: number, utcOffsetMinutes: number): DayKey {
  return new Date(epochMs + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

function parseDayKey(key: DayKey): number {
  const match = DAY_KEY_PATTERN.exec(key);
  if (match === null) throw new Error(`Jour invalide : ${key}`);
  const [, y, m, d] = match;
  const time = Date.UTC(Number(y), Number(m) - 1, Number(d));
  if (new Date(time).toISOString().slice(0, 10) !== key) throw new Error(`Jour invalide : ${key}`);
  return time;
}

export function isDayKey(value: string): boolean {
  try {
    parseDayKey(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(key: DayKey, days: number): DayKey {
  return new Date(parseDayKey(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Nombre de jours de `from` à `to` (négatif si `to` est avant). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((parseDayKey(to) - parseDayKey(from)) / DAY_MS);
}
