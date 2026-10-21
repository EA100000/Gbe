import type { ItemAnsweredEvent } from './events';
import {
  itemKey,
  itemStats,
  itemsToStrengthen,
  masteryOf,
  mistakesToReview,
  pickReviewItems,
  practiceMinutes,
} from './review';

const T0 = Date.UTC(2026, 9, 21, 9, 0);
let counter = 0;

function answered(
  itemId: string,
  correct: boolean,
  minutes = 0,
  mode: ItemAnsweredEvent['mode'] = 'lesson',
): ItemAnsweredEvent {
  counter += 1;
  return {
    id: `a${counter}`,
    type: 'item_answered',
    at: T0 + minutes * 60_000,
    dayKey: '2026-10-21',
    unitId: 'u01',
    itemId,
    correct,
    mode,
  };
}

describe('réviser', () => {
  it('garde les quatre derniers premiers essais de chaque mot', () => {
    const events = [true, false, true, true, false].map((c, i) => answered('sin', c, i));

    const stat = itemStats(events).get(itemKey('u01', 'sin'));

    expect(stat?.recent).toEqual([false, true, true, false]);
    expect(stat === undefined ? null : masteryOf(stat)).toBe(2);
  });

  it('compte une seule fois un événement reçu deux fois', () => {
    const event = answered('sin', false);

    const stat = itemStats([event, event]).get('u01:sin');

    expect(stat?.recent).toEqual([false]);
  });

  it('garde une erreur réussie ensuite dans la même leçon, la plus récente d’abord', () => {
    const stats = itemStats([
      answered('sin', false, 1),
      answered('sin', true, 2),
      answered('hwe', false, 3),
    ]).values();

    expect(mistakesToReview(stats).map((s) => s.itemId)).toEqual(['hwe', 'sin']);
  });

  it('corrige une erreur réussie en révision ou en écoute', () => {
    const stats = itemStats([
      answered('sin', false, 1),
      answered('sin', true, 2, 'review'),
      answered('hwe', false, 3),
      answered('hwe', true, 4, 'listen'),
      answered('xwe', false, 5),
      answered('xwe', false, 6, 'review'),
    ]).values();

    expect(mistakesToReview(stats).map((s) => s.itemId)).toEqual(['xwe']);
  });

  it('propose à consolider les mots les moins maîtrisés, puis les plus anciens', () => {
    const stats = [
      ...itemStats([
        answered('a', true, 1),
        answered('b', true, 2),
        answered('b', true, 3),
        answered('c', true, 0),
        answered('d', true, 5),
        answered('d', true, 6),
        answered('d', true, 7),
        answered('d', true, 8),
      ]).values(),
    ];

    expect(itemsToStrengthen(stats, 3).map((s) => s.itemId)).toEqual(['c', 'a', 'b']);
  });

  it('commence une révision par les erreurs, sans doublon, dans la limite donnée', () => {
    const stats = [
      ...itemStats([
        answered('juste', true, 1),
        answered('faux', false, 2),
        answered('fragile', true, 3),
        answered('fragile', false, 4),
      ]).values(),
    ];

    expect(pickReviewItems(stats).map((s) => s.itemId)).toEqual(['fragile', 'faux', 'juste']);
    expect(pickReviewItems(stats, 2)).toHaveLength(2);
  });

  it('annonce la durée d’une séance en minutes entières, au moins une', () => {
    expect([0, 3, 9, 10].map(practiceMinutes)).toEqual([1, 1, 3, 4]);
  });
});
