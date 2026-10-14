import { gradeBuildSentence, gradeImageChoice, gradeStoryChoice } from './grading';

describe('gradeImageChoice', () => {
  const exercise = { answer: 'item-eau' };

  it('juge juste la bonne image', () => {
    expect(gradeImageChoice(exercise, 'item-eau').correct).toBe(true);
  });

  it('juge faux une autre image', () => {
    expect(gradeImageChoice(exercise, 'item-soleil').correct).toBe(false);
  });

  it('juge faux quand rien n’est sélectionné', () => {
    expect(gradeImageChoice(exercise, null).correct).toBe(false);
  });
});

describe('gradeBuildSentence', () => {
  const expected = ['m1', 'm2', 'm3'];

  it('juge juste les bons mots dans le bon ordre', () => {
    expect(gradeBuildSentence(['m1', 'm2', 'm3'], expected).correct).toBe(true);
  });

  it('juge faux un mauvais ordre', () => {
    expect(gradeBuildSentence(['m2', 'm1', 'm3'], expected).correct).toBe(false);
  });

  it('juge faux un mot en trop', () => {
    expect(gradeBuildSentence(['m1', 'm2', 'm3', 'm4'], expected).correct).toBe(false);
  });

  it('juge faux un mot manquant', () => {
    expect(gradeBuildSentence(['m1', 'm3'], expected).correct).toBe(false);
  });

  it('accepte le même mot encodé avec un ton combiné ou précomposé', () => {
    // Préparer : « í » précomposé attendu, saisi avec « i » + accent combinant
    const attendu = ['n\u00ed'];
    const saisi = ['ni\u0301'];
    // Agir
    const grade = gradeBuildSentence(saisi, attendu);
    // Vérifier
    expect(grade.correct).toBe(true);
  });

  it('refuse un mot dont le ton diffère', () => {
    expect(gradeBuildSentence(['z\u00e0'], ['z\u00e1']).correct).toBe(false);
  });
});

describe('gradeStoryChoice', () => {
  const exercise = {
    question: {
      promptFr: 'Que réponds-tu ?',
      successFr: 'Bien joué !',
      choices: [
        { fon: 'r1', correct: false, explanation: [{ fr: 'Pas encore' }] },
        { fon: 'r2', correct: true, explanation: [{ fr: 'Bravo' }] },
      ],
    },
  };

  it('juge juste la bonne réplique et renvoie son explication', () => {
    const grade = gradeStoryChoice(exercise, 1);
    expect(grade.correct).toBe(true);
    expect(grade.choice?.explanation).toEqual([{ fr: 'Bravo' }]);
  });

  it('juge faux une autre réplique', () => {
    expect(gradeStoryChoice(exercise, 0).correct).toBe(false);
  });

  it('juge faux un indice hors de la liste', () => {
    expect(gradeStoryChoice(exercise, 7)).toEqual({ correct: false, choice: null });
  });
});
