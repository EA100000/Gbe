import { mergeContents } from '../../core/content/practiceContent';
import { testContent } from '../../test-utils/fixtures';
import { answeredItem, firstTryAnswers } from './answers';
import { lessonReducer, startLesson, type LessonExercise } from './lessonMachine';

const image: LessonExercise = {
  id: 'e1',
  type: 'image_choice',
  promptFr: 'Lequel ?',
  choices: ['sin', 'hwe'],
  answer: 'sin',
};
const pairs: LessonExercise = {
  id: 'e2',
  type: 'match_pairs',
  promptFr: 'Associe',
  pairs: [
    { fon: 'sin', fr: 'eau' },
    { fon: 'hwè', fr: 'soleil' },
    { fon: 'xwé', fr: 'maison' },
  ],
};

describe('premiers essais', () => {
  it('note la réponse vérifiée au premier essai, puis plus rien après une erreur', () => {
    // Préparer
    const start = startLesson('l', [image], 5, 0, 1);
    const picked = lessonReducer(start, { type: 'select_choice', itemId: 'hwe' });
    // Agir
    const wrong = lessonReducer(picked, { type: 'check' });
    const again = lessonReducer(
      lessonReducer(lessonReducer(wrong, { type: 'retry' }), {
        type: 'select_choice',
        itemId: 'sin',
      }),
      { type: 'check' },
    );
    // Vérifier
    expect(firstTryAnswers(picked, wrong)).toEqual([{ kind: 'item', id: 'sin', correct: false }]);
    expect(firstTryAnswers(lessonReducer(wrong, { type: 'retry' }), again)).toEqual([]);
  });

  it('note chaque paire à la fin, fausse si son mot fon a été mal associé', () => {
    let state = startLesson('l', [pairs], 5, 0, 1);
    const tap = (side: 'left' | 'right', pair: number) => {
      state = lessonReducer(state, { type: 'tap_pair', side, pair });
    };
    tap('left', 0);
    tap('right', 1);
    tap('left', 1);
    tap('right', 1);
    tap('left', 2);
    tap('right', 2);
    const before = state;
    tap('left', 0);
    tap('right', 0);

    expect(firstTryAnswers(before, state)).toEqual([
      { kind: 'fon', text: 'sin', correct: false },
      { kind: 'fon', text: 'hwè', correct: true },
      { kind: 'fon', text: 'xwé', correct: true },
    ]);
  });

  it('relie une réponse à son mot par identifiant, audio ou texte fon', () => {
    const content = testContent();

    expect(answeredItem(content, { kind: 'item', id: 'sin', correct: true })).toEqual({
      unitId: 'u01',
      itemId: 'sin',
    });
    expect(answeredItem(content, { kind: 'audio', id: 'merci-n', correct: true })?.itemId).toBe(
      'merci',
    );
    expect(answeredItem(content, { kind: 'fon', text: 'hwè', correct: true })?.itemId).toBe('hwe');
    expect(answeredItem(content, { kind: 'item', id: 'inconnu', correct: true })).toBeNull();
  });

  it('retrouve l’unité d’un mot dans le contenu fusionné des séances', () => {
    const merged = mergeContents([testContent()]);
    if (merged === null) throw new Error('contenu');

    expect(answeredItem(merged, { kind: 'item', id: 'u01:kwe', correct: false })).toEqual({
      unitId: 'u01',
      itemId: 'kwe',
    });
  });
});
