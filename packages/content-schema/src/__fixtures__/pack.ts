import type { Pack } from '../schema';

/**
 * Fabrique un pack minimal et cohérent pour les tests.
 * Les textes sont des marqueurs neutres, pas de vrais mots fon :
 * le vrai contenu vient uniquement des packs validés par les experts.
 */
export function buildPack(overrides: Partial<Pack> = {}): Pack {
  const base: Pack = {
    formatVersion: 1,
    id: 'test-unit-01',
    version: 1,
    validated: false,
    unit: {
      id: 'u01',
      order: 1,
      title: 'Unité test',
      subtitle: 'Sous-titre test',
      lessons: [
        {
          id: 'l01',
          kind: 'standard',
          title: 'Leçon test',
          exercises: [
            {
              id: 'e01',
              type: 'image_choice',
              promptFr: 'Choisis la bonne image',
              choices: ['item-a', 'item-b'],
              answer: 'item-a',
            },
            {
              id: 'e02',
              type: 'build_sentence',
              promptFr: 'Traduis',
              sentenceFr: 'Phrase test',
              solution: ['mot1', 'mot2'],
              distractors: ['mot3'],
              audio: 'aud-a',
            },
            {
              id: 'e03',
              type: 'match_pairs',
              promptFr: 'Associe',
              pairs: [
                { fon: 'p1', fr: 'un' },
                { fon: 'p2', fr: 'deux' },
                { fon: 'p3', fr: 'trois' },
              ],
            },
            {
              id: 'e04',
              type: 'pronunciation',
              promptFr: 'Répète',
              item: 'item-a',
            },
          ],
        },
        {
          id: 'l02',
          kind: 'story',
          title: 'Histoire test',
          exercises: [
            {
              id: 'e05',
              type: 'story',
              title: 'Au marché',
              setting: 'Décor test',
              lines: [
                { speaker: 'vendor', fon: 'replique1', fr: 'Réplique un', audio: 'aud-a' },
                { speaker: 'vendor', audio: 'aud-b', audioOnly: true },
              ],
              question: {
                promptFr: 'Que réponds-tu ?',
                successFr: 'Bien joué !',
                choices: [
                  {
                    fon: 'rep1',
                    correct: true,
                    explanation: [{ fon: 'rep1' }, { fr: ' : bravo' }],
                  },
                  { fon: 'rep2', correct: false, explanation: [{ fr: 'Mauvaise réponse' }] },
                ],
              },
            },
          ],
        },
      ],
    },
    items: [
      {
        id: 'item-a',
        fon: 'mota',
        fr: 'mot A',
        illustration: 'ill-a',
        audio: { normal: 'aud-a', slow: 'aud-b' },
      },
      { id: 'item-b', fon: 'motb', fr: 'mot B', illustration: 'ill-b' },
    ],
    audios: [
      { id: 'aud-a', file: 'audio/a.m4a', voice: 'A', speed: 'normal', durationMs: 900 },
      { id: 'aud-b', file: 'audio/b.m4a', voice: 'B', speed: 'slow', durationMs: 1400 },
    ],
    illustrations: [
      { id: 'ill-a', svg: '<svg viewBox="0 0 10 10"></svg>' },
      { id: 'ill-b', svg: '<svg viewBox="0 0 10 10"></svg>' },
    ],
    sounds: {
      letters: [{ symbol: 'x', exampleFon: 'xa', exampleFr: 'exemple', audio: 'aud-a' }],
      nasals: [{ symbol: 'an', audio: 'aud-b' }],
      nasalExamples: [{ fon: 'xan', fr: 'exemple' }],
      tones: [{ mark: 'á', nameFr: 'haut', contour: 'high' }],
    },
  };
  return { ...base, ...overrides };
}

/** Copie profonde modifiable, pour casser un pack dans un test. */
export function clonePack(pack: Pack): Pack {
  return structuredClone(pack);
}
