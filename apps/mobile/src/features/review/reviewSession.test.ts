import { createRng, itemStats, type ItemAnsweredEvent } from '@gbe/domain';

import { mergeContents } from '../../core/content/practiceContent';
import { testContent } from '../../test-utils/fixtures';
import { buildReview, buildReviewExercises } from './reviewSession';

function merged() {
  const content = mergeContents([testContent()]);
  if (content === null) throw new Error('contenu');
  return content;
}

let n = 0;
const answered = (itemId: string, correct: boolean): ItemAnsweredEvent => {
  n += 1;
  return {
    id: `r${n}`,
    type: 'item_answered',
    at: n,
    dayKey: '2026-10-21',
    unitId: 'u01',
    itemId,
    correct,
    mode: 'lesson',
  };
};

describe('séance « Mes erreurs »', () => {
  it('propose une image par mot illustré raté, avec l’étiquette de l’erreur', () => {
    // Préparer
    const stats = itemStats([answered('sin', false)]);
    // Agir
    const exercises = buildReview(stats, merged(), createRng(3));
    // Vérifier
    expect(exercises).toHaveLength(1);
    expect(exercises[0]).toMatchObject({
      type: 'image_choice',
      answer: 'u01:sin',
      promptFr: 'Lequel veut dire « eau » ?',
      tag: { kind: 'review', labelFr: 'Ton erreur d’avant' },
    });
    if (exercises[0]?.type === 'image_choice') {
      expect(exercises[0].choices).toContain('u01:sin');
      expect(new Set(exercises[0].choices).size).toBe(exercises[0].choices.length);
    }
  });

  it('range les mots sans image en paires, complétées par des mots déjà vus', () => {
    const stats = itemStats([answered('merci', false), answered('n1', true), answered('n2', true)]);

    const exercises = buildReview(stats, merged(), createRng(5));

    const pairs = exercises.find((e) => e.type === 'match_pairs');
    expect(pairs?.type).toBe('match_pairs');
    if (pairs?.type === 'match_pairs') {
      expect(pairs.pairs.map((p) => p.fon)).toEqual(expect.arrayContaining(['A wà nǔ']));
      expect(pairs.pairs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(pairs.pairs.map((p) => p.fr)).size).toBe(pairs.pairs.length);
    }
  });

  it('ne propose rien sans historique', () => {
    expect(buildReview(new Map(), merged(), createRng(1))).toEqual([]);
  });

  it('ignore un mot qui n’existe plus dans les packs', () => {
    const stats = itemStats([answered('disparu', false)]);

    expect(buildReview(stats, merged(), createRng(1))).toEqual([]);
  });

  it('n’assemble pas de paires sans assez de mots', () => {
    const content = merged();
    const only = {
      ...content,
      itemsById: new Map([...content.itemsById].filter(([key]) => key === 'u01:merci')),
    };
    const stats = [...itemStats([answered('merci', false)]).values()];

    expect(buildReviewExercises(stats, only, new Set(), new Set(), createRng(1))).toEqual([]);
  });
});
