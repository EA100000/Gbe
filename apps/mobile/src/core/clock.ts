import { toDayKey, type DayKey } from '@gbe/domain';

/**
 * Horloge de l'appli. Les règles du jeu ne lisent jamais l'heure elles-mêmes :
 * l'appli la leur passe, ce qui rend tout testable.
 */
export interface Clock {
  now(): number;
  /** Décalage UTC du téléphone à cet instant, en minutes (Bénin : +60). */
  utcOffsetMinutes(at: number): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  utcOffsetMinutes: (at) => -new Date(at).getTimezoneOffset(),
};

export function dayKeyAt(clock: Clock, at: number): DayKey {
  return toDayKey(at, clock.utcOffsetMinutes(at));
}
