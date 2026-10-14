import type {
  BuildSentenceExercise,
  ImageChoiceExercise,
  MatchPairsExercise,
} from '@gbe/content-schema';

import {
  canCheck,
  currentExercise,
  lessonReducer,
  startLesson,
  type LessonViewState,
} from './lessonMachine';

const image: ImageChoiceExercise = {
  id: 'e1',
  type: 'image_choice',
  promptFr: 'Choisis',
  choices: ['a', 'b'],
  answer: 'a',
};
const sentence: BuildSentenceExercise = {
  id: 'e2',
  type: 'build_sentence',
  promptFr: 'Traduis',
  sentenceFr: 'Phrase',
  solution: ['m1', 'm2'],
  distractors: ['d1'],
};
const pairs: MatchPairsExercise = {
  id: 'e3',
  type: 'match_pairs',
  promptFr: 'Associe',
  pairs: [
    { fon: 'p1', fr: 'un' },
    { fon: 'p2', fr: 'deux' },
    { fon: 'p3', fr: 'trois' },
  ],
};

const start = (hearts = 5): LessonViewState =>
  startLesson('l1', [image, sentence, pairs], hearts, 0, 42);

function tileOf(state: LessonViewState, text: string): number {
  const tile = state.sentence?.bank.find((t) => t.text === text);
  if (tile === undefined) throw new Error(`Tuile absente : ${text}`);
  return tile.id;
}

describe('lessonReducer', () => {
  it('commence par un choix d’images, bouton « Vérifier » inactif', () => {
    const state = start();
    expect(currentExercise(state)?.id).toBe('e1');
    expect(canCheck(state)).toBe(false);
  });

  it('active « Vérifier » dès qu’une image est choisie', () => {
    const state = lessonReducer(start(), { type: 'select_choice', itemId: 'b' });
    expect(state.selectedChoice).toBe('b');
    expect(canCheck(state)).toBe(true);
  });

  it('ignore un choix qui ne fait pas partie de l’exercice', () => {
    const state = start();
    expect(lessonReducer(state, { type: 'select_choice', itemId: 'zzz' })).toBe(state);
  });

  it('retire une vie sur une mauvaise image, puis « Réessayer » vide la sélection', () => {
    let state = lessonReducer(start(), { type: 'select_choice', itemId: 'b' });
    state = lessonReducer(state, { type: 'check' });
    expect(state.session.phase).toBe('wrong');
    expect(state.session.hearts).toBe(4);
    state = lessonReducer(state, { type: 'retry' });
    expect(state.session.phase).toBe('answering');
    expect(state.selectedChoice).toBeNull();
  });

  it('bloque le choix d’une autre image pendant la correction', () => {
    let state = lessonReducer(start(), { type: 'select_choice', itemId: 'a' });
    state = lessonReducer(state, { type: 'check' });
    expect(lessonReducer(state, { type: 'select_choice', itemId: 'b' })).toBe(state);
  });

  it('prépare la banque de mots en passant à la phrase à construire', () => {
    let state = lessonReducer(start(), { type: 'select_choice', itemId: 'a' });
    state = lessonReducer(lessonReducer(state, { type: 'check' }), { type: 'next' });
    expect(currentExercise(state)?.id).toBe('e2');
    expect(state.sentence?.bank).toHaveLength(3);
    expect(state.selectedChoice).toBeNull();
  });

  it('corrige la phrase construite et efface la réponse pour réessayer', () => {
    let state = lessonReducer(start(), { type: 'select_choice', itemId: 'a' });
    state = lessonReducer(lessonReducer(state, { type: 'check' }), { type: 'next' });
    state = lessonReducer(state, { type: 'place_tile', tileId: tileOf(state, 'm2') });
    state = lessonReducer(state, { type: 'place_tile', tileId: tileOf(state, 'm1') });
    state = lessonReducer(state, { type: 'check' });
    expect(state.session.phase).toBe('wrong');
    state = lessonReducer(state, { type: 'retry' });
    expect(state.sentence?.answer).toEqual([]);
  });

  it('retire un mot placé par erreur', () => {
    let state = lessonReducer(start(), { type: 'select_choice', itemId: 'a' });
    state = lessonReducer(lessonReducer(state, { type: 'check' }), { type: 'next' });
    const id = tileOf(state, 'd1');
    state = lessonReducer(state, { type: 'place_tile', tileId: id });
    state = lessonReducer(state, { type: 'remove_tile', tileId: id });
    expect(state.sentence?.answer).toEqual([]);
    expect(canCheck(state)).toBe(false);
  });

  it('termine les paires sans perdre de vie, même après une erreur d’association', () => {
    let state = startLesson('l1', [pairs], 5, 0, 7);
    state = lessonReducer(state, { type: 'tap_pair', side: 'left', pair: 0 });
    state = lessonReducer(state, { type: 'tap_pair', side: 'right', pair: 1 });
    for (const pair of [0, 1, 2]) {
      state = lessonReducer(state, { type: 'tap_pair', side: 'left', pair });
      state = lessonReducer(state, { type: 'tap_pair', side: 'right', pair });
    }
    expect(state.session.phase).toBe('correct');
    expect(state.session.hearts).toBe(5);
    expect(state.session.firstTryCorrect).toBe(0);
    expect(lessonReducer(state, { type: 'next' }).session.phase).toBe('finished');
  });

  it('ignore les actions d’un autre type d’exercice', () => {
    const state = start();
    expect(lessonReducer(state, { type: 'place_tile', tileId: 0 })).toBe(state);
    expect(lessonReducer(state, { type: 'tap_pair', side: 'left', pair: 0 })).toBe(state);
    expect(lessonReducer(state, { type: 'check' })).toBe(state);
    expect(lessonReducer(state, { type: 'retry' })).toBe(state);
    expect(lessonReducer(state, { type: 'next' })).toBe(state);
  });

  it('démarre bloquée quand il ne reste aucune vie', () => {
    expect(start(0).session.phase).toBe('out_of_hearts');
  });
});
