/**
 * Vies. Valeurs provisoires, à confirmer (voir docs/adr/0003-regles-du-jeu.md).
 */
export const MAX_HEARTS = 5;
export const HEART_REFILL_MS = 30 * 60_000;

export interface HeartsState {
  count: number;
  /** Début du minuteur de recharge ; `null` quand les vies sont au maximum. */
  refillFrom: number | null;
}

export const FULL_HEARTS: HeartsState = { count: MAX_HEARTS, refillFrom: null };

/** Applique la recharge écoulée jusqu'à `now` : une vie par période, jusqu'au maximum. */
export function refillHearts(state: HeartsState, now: number): HeartsState {
  if (state.refillFrom === null || state.count >= MAX_HEARTS) {
    return { count: Math.min(state.count, MAX_HEARTS), refillFrom: null };
  }
  const elapsed = Math.max(0, now - state.refillFrom);
  const gained = Math.floor(elapsed / HEART_REFILL_MS);
  const count = Math.min(MAX_HEARTS, state.count + gained);
  if (count >= MAX_HEARTS) return { count: MAX_HEARTS, refillFrom: null };
  return { count, refillFrom: state.refillFrom + gained * HEART_REFILL_MS };
}

/** Perd une vie à l'instant `at`, jamais en dessous de zéro. */
export function loseHeart(state: HeartsState, at: number): HeartsState {
  const current = refillHearts(state, at);
  if (current.count === 0) return current;
  return { count: current.count - 1, refillFrom: current.refillFrom ?? at };
}

/** État des vies à `now`, à partir des instants où une vie a été perdue. */
export function computeHearts(lossTimes: readonly number[], now: number): HeartsState {
  const sorted = [...lossTimes].sort((a, b) => a - b);
  const afterLosses = sorted.reduce<HeartsState>((state, at) => loseHeart(state, at), FULL_HEARTS);
  return refillHearts(afterLosses, now);
}

/** Instant de la prochaine vie rechargée, ou `null` si les vies sont pleines. */
export function nextHeartAt(state: HeartsState): number | null {
  return state.refillFrom === null ? null : state.refillFrom + HEART_REFILL_MS;
}
