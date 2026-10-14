import fc from 'fast-check';

import {
  computeHearts,
  FULL_HEARTS,
  fullHeartsAt,
  HEART_REFILL_MS,
  loseHeart,
  MAX_HEARTS,
  nextHeartAt,
  refillHearts,
} from './hearts';

const T0 = Date.UTC(2026, 9, 13, 9, 0);

describe('loseHeart', () => {
  it('retire une vie et lance le minuteur de recharge', () => {
    expect(loseHeart(FULL_HEARTS, T0)).toEqual({ count: MAX_HEARTS - 1, refillFrom: T0 });
  });

  it('ne relance pas le minuteur s’il tourne déjà', () => {
    const once = loseHeart(FULL_HEARTS, T0);
    expect(loseHeart(once, T0 + 1000)).toEqual({ count: MAX_HEARTS - 2, refillFrom: T0 });
  });

  it('ne descend jamais en dessous de zéro', () => {
    const empty = { count: 0, refillFrom: T0 };
    expect(loseHeart(empty, T0 + 1000).count).toBe(0);
  });
});

describe('refillHearts', () => {
  it('rend une vie après une période de recharge', () => {
    const state = { count: 3, refillFrom: T0 };
    expect(refillHearts(state, T0 + HEART_REFILL_MS)).toEqual({
      count: 4,
      refillFrom: T0 + HEART_REFILL_MS,
    });
  });

  it('ne rend rien avant la fin de la période', () => {
    const state = { count: 3, refillFrom: T0 };
    expect(refillHearts(state, T0 + HEART_REFILL_MS - 1)).toEqual(state);
  });

  it('s’arrête au maximum et coupe le minuteur', () => {
    const state = { count: 1, refillFrom: T0 };
    expect(refillHearts(state, T0 + 100 * HEART_REFILL_MS)).toEqual(FULL_HEARTS);
  });

  it('ne rend rien si l’horloge recule', () => {
    const state = { count: 2, refillFrom: T0 };
    expect(refillHearts(state, T0 - HEART_REFILL_MS)).toEqual(state);
  });

  it('laisse des vies pleines inchangées', () => {
    expect(refillHearts(FULL_HEARTS, T0)).toEqual(FULL_HEARTS);
  });
});

describe('computeHearts', () => {
  it('donne toutes les vies sans perte', () => {
    expect(computeHearts([], T0)).toEqual(FULL_HEARTS);
  });

  it('applique les pertes dans l’ordre chronologique, même reçues en désordre', () => {
    const losses = [T0 + 2000, T0, T0 + 1000];
    expect(computeHearts(losses, T0 + 3000)).toEqual({ count: 2, refillFrom: T0 });
  });

  it('tient compte de la recharge entre deux pertes', () => {
    // Une vie perdue, rechargée, puis une autre perdue
    const losses = [T0, T0 + HEART_REFILL_MS + 5];
    expect(computeHearts(losses, T0 + HEART_REFILL_MS + 10)).toEqual({
      count: MAX_HEARTS - 1,
      refillFrom: T0 + HEART_REFILL_MS + 5,
    });
  });

  it('reste toujours entre 0 et le maximum (propriété)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 * HEART_REFILL_MS }), { maxLength: 30 }),
        fc.integer({ min: 0, max: 20 * HEART_REFILL_MS }),
        (offsets, nowOffset) => {
          const state = computeHearts(
            offsets.map((o) => T0 + o),
            T0 + nowOffset,
          );
          expect(state.count).toBeGreaterThanOrEqual(0);
          expect(state.count).toBeLessThanOrEqual(MAX_HEARTS);
        },
      ),
    );
  });
});

describe('nextHeartAt', () => {
  it('annonce la prochaine vie quand le minuteur tourne', () => {
    expect(nextHeartAt({ count: 2, refillFrom: T0 })).toBe(T0 + HEART_REFILL_MS);
  });

  it('ne renvoie rien quand les vies sont pleines', () => {
    expect(nextHeartAt(FULL_HEARTS)).toBeNull();
  });
});

describe('fullHeartsAt', () => {
  it('rend l’instant où toutes les vies seront revenues', () => {
    // Préparer : 5 vies perdues à T0, minuteur lancé à T0.
    const state = computeHearts([T0, T0, T0, T0, T0], T0);
    // Agir et vérifier
    expect(state.count).toBe(0);
    expect(fullHeartsAt(state)).toBe(T0 + 5 * HEART_REFILL_MS);
  });

  it('tient compte des vies déjà revenues', () => {
    const state = computeHearts([T0, T0, T0], T0 + HEART_REFILL_MS + 1);
    expect(state.count).toBe(3);
    expect(fullHeartsAt(state)).toBe(T0 + 3 * HEART_REFILL_MS);
  });

  it('ne rend rien quand les vies sont pleines', () => {
    expect(fullHeartsAt(FULL_HEARTS)).toBeNull();
  });

  it('n’arrive jamais avant la prochaine vie', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 4 * HEART_REFILL_MS }), { maxLength: 8 }),
        (offsets) => {
          const state = computeHearts(
            offsets.map((o) => T0 + o),
            T0 + 4 * HEART_REFILL_MS,
          );
          const next = nextHeartAt(state);
          const full = fullHeartsAt(state);
          expect(full === null).toBe(next === null);
          if (next !== null && full !== null) expect(full).toBeGreaterThanOrEqual(next);
        },
      ),
    );
  });
});
