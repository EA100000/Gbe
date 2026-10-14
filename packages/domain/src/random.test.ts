import fc from 'fast-check';

import { createRng, shuffle, shuffleAwayFromOriginal } from './random';

describe('createRng', () => {
  it('donne la même suite pour la même graine', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('reste dans l’intervalle [0, 1) (propriété)', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const rng = createRng(seed);
        for (let i = 0; i < 20; i++) {
          const value = rng();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(1);
        }
      }),
    );
  });
});

describe('shuffle', () => {
  it('garde exactement les mêmes éléments sans modifier l’entrée (propriété)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.integer(), (items, seed) => {
        const copy = [...items];
        const result = shuffle(items, createRng(seed));
        expect(items).toEqual(copy);
        expect([...result].sort()).toEqual([...items].sort());
      }),
    );
  });
});

describe('shuffleAwayFromOriginal', () => {
  it('ne rend jamais l’ordre d’origine quand les éléments sont distincts (propriété)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer(), { minLength: 2, maxLength: 8 }),
        fc.integer(),
        (items, seed) => {
          const result = shuffleAwayFromOriginal(items, createRng(seed));
          expect(result).not.toEqual(items);
        },
      ),
    );
  });

  it('décale d’un cran quand le hasard redonne l’ordre d’origine', () => {
    const alwaysLast = () => 0.999;
    expect(shuffleAwayFromOriginal([1, 2, 3], alwaysLast)).toEqual([2, 3, 1]);
  });

  it('laisse une liste d’un seul élément telle quelle', () => {
    expect(shuffleAwayFromOriginal(['a'], createRng(1))).toEqual(['a']);
  });
});
