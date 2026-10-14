/**
 * Jetons d'injection. Chaque dépendance est injectée explicitement (@Inject),
 * ce qui évite de dépendre des métadonnées de type générées par TypeScript.
 */
export const CONFIG = Symbol('CONFIG');
export const DATABASE = Symbol('DATABASE');
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
