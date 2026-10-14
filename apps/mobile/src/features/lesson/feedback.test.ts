import type { LexiconItem } from '@gbe/content-schema';

import { buildFeedback } from './feedback';
import { lessonReducer, startLesson, type LessonExercise } from './lessonMachine';

const items = new Map<string, LexiconItem>([
  ['a', { id: 'a', fon: 'mota', fr: 'eau' }],
  ['b', { id: 'b', fon: 'motb', fr: 'argent', note: 'une précision' }],
]);

const exercises: LessonExercise[] = [
  { id: 'e1', type: 'image_choice', promptFr: 'Choisis', choices: ['a', 'b'], answer: 'a' },
  {
    id: 'e2',
    type: 'build_sentence',
    promptFr: 'Traduis',
    sentenceFr: 'Phrase',
    solution: ['m1', 'm2'],
    answerFon: 'M1 m2 ?',
    distractors: [],
    noteFr: 'Utile au marché.',
  },
];

function answerImage(choice: string) {
  const state = lessonReducer(startLesson('l', exercises, 5, 0, 1), {
    type: 'select_choice',
    itemId: choice,
  });
  return lessonReducer(state, { type: 'check' });
}

describe('buildFeedback', () => {
  it('ne montre rien tant que l’apprenant n’a pas vérifié', () => {
    expect(buildFeedback(startLesson('l', exercises, 5, 0, 1), items, undefined, 0)).toBeNull();
  });

  it('félicite avec l’expression fon du pack et rappelle le sens du mot', () => {
    const feedback = buildFeedback(answerImage('a'), items, { approval: 'Oui !' }, 0);
    expect(feedback).toEqual({
      tone: 'correct',
      title: [{ fon: 'Oui !' }, { fr: ' Bravo !' }],
      body: [{ fon: 'mota' }, { fr: ' veut dire « eau »' }, { fr: '.' }],
      button: 'continue',
    });
  });

  it('se contente du français quand le pack n’a pas d’expression fon', () => {
    expect(buildFeedback(answerImage('a'), items, undefined, 0)?.title).toEqual([
      { fr: 'Bravo !' },
    ]);
  });

  it('explique le mot choisi par erreur, avec sa note, et annonce la vie perdue', () => {
    const feedback = buildFeedback(answerImage('b'), items, undefined, 0);
    expect(feedback?.tone).toBe('wrong');
    expect(feedback?.button).toBe('retry');
    expect(feedback?.body).toEqual([
      { fon: 'motb' },
      { fr: ' veut dire « argent » (une précision)' },
      { fr: '. Tu perds une vie.' },
    ]);
  });

  it('montre la phrase complète et sa note quand la phrase est juste', () => {
    let state = lessonReducer(answerImage('a'), { type: 'next' });
    for (const text of ['m1', 'm2']) {
      const tile = state.sentence?.bank.find((t) => t.text === text);
      state = lessonReducer(state, { type: 'place_tile', tileId: tile?.id ?? -1 });
    }
    state = lessonReducer(state, { type: 'check' });
    expect(buildFeedback(state, items, undefined, 0)?.body).toEqual([
      { fon: 'M1 m2 ?' },
      { fr: ' Utile au marché.' },
    ]);
  });

  it('donne la bonne réponse quand la phrase est fausse', () => {
    let state = lessonReducer(answerImage('a'), { type: 'next' });
    const tile = state.sentence?.bank.find((t) => t.text === 'm2');
    state = lessonReducer(state, { type: 'place_tile', tileId: tile?.id ?? -1 });
    state = lessonReducer(state, { type: 'check' });
    const feedback = buildFeedback(state, items, undefined, 0);
    expect(feedback?.title).toEqual([{ fr: 'Bonne réponse :' }]);
    expect(feedback?.body).toEqual([{ fon: 'M1 m2 ?' }]);
  });

  it('annonce la fin des vies avec le délai avant la prochaine', () => {
    const feedback = buildFeedback(startLesson('l', exercises, 0, 0, 1), items, undefined, 12);
    expect(feedback?.button).toBe('outOfHearts');
    expect(feedback?.body).toEqual([{ fr: 'Ta prochaine vie arrive dans 12 min.' }]);
  });
});
