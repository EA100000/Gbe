import {
  completeWithoutHeartCost,
  currentExerciseId,
  next,
  retry,
  sessionProgress,
  startSession,
  submitAnswer,
  summarizeSession,
  type LessonSession,
} from './session';
import { ACCURACY_BONUS_XP, LESSON_XP } from './xp';

const T0 = Date.UTC(2026, 9, 13, 9, 0);
const start = (hearts = 5): LessonSession => startSession(['e1', 'e2', 'e3'], hearts, T0);

describe('startSession', () => {
  it('commence par le premier exercice', () => {
    const session = start();
    expect(currentExerciseId(session)).toBe('e1');
    expect(session.phase).toBe('answering');
  });

  it('refuse une leçon sans exercice', () => {
    expect(() => startSession([], 5, T0)).toThrow('au moins un exercice');
  });

  it('bloque la leçon quand il ne reste aucune vie', () => {
    expect(start(0).phase).toBe('out_of_hearts');
  });
});

describe('submitAnswer', () => {
  it('passe en « juste » sans perdre de vie', () => {
    const session = submitAnswer(start(), true);
    expect(session.phase).toBe('correct');
    expect(session.hearts).toBe(5);
    expect(session.firstTryCorrect).toBe(1);
  });

  it('retire une vie sur une réponse fausse', () => {
    const session = submitAnswer(start(), false);
    expect(session.phase).toBe('wrong');
    expect(session.hearts).toBe(4);
    expect(session.heartsLost).toBe(1);
  });

  it('ne compte pas comme « premier coup » une réussite après une erreur', () => {
    const session = submitAnswer(retry(submitAnswer(start(), false)), true);
    expect(session.firstTryCorrect).toBe(0);
  });

  it('arrête la leçon quand la dernière vie est perdue', () => {
    const session = submitAnswer(start(1), false);
    expect(session.phase).toBe('out_of_hearts');
    expect(session.hearts).toBe(0);
  });

  it('ignore une réponse envoyée hors de la phase de réponse (double appui)', () => {
    const answered = submitAnswer(start(), true);
    expect(submitAnswer(answered, false)).toBe(answered);
  });
});

describe('retry et next', () => {
  it('« Réessayer » revient au même exercice', () => {
    const session = retry(submitAnswer(start(), false));
    expect(session.phase).toBe('answering');
    expect(currentExerciseId(session)).toBe('e1');
  });

  it('« Continuer » passe à l’exercice suivant', () => {
    const session = next(submitAnswer(start(), true));
    expect(currentExerciseId(session)).toBe('e2');
    expect(session.phase).toBe('answering');
  });

  it('termine la leçon après le dernier exercice', () => {
    let session = start();
    for (let i = 0; i < 3; i++) session = next(submitAnswer(session, true));
    expect(session.phase).toBe('finished');
    expect(currentExerciseId(session)).toBeUndefined();
  });

  it('ignore « Réessayer » et « Continuer » dans une mauvaise phase', () => {
    const session = start();
    expect(retry(session)).toBe(session);
    expect(next(session)).toBe(session);
  });
});

describe('completeWithoutHeartCost (paires)', () => {
  it('compte un sans-faute comme réussi du premier coup', () => {
    const session = completeWithoutHeartCost(start(), 0);
    expect(session.phase).toBe('correct');
    expect(session.firstTryCorrect).toBe(1);
  });

  it('ne retire pas de vie mais compte les erreurs dans la précision', () => {
    const session = completeWithoutHeartCost(start(), 2);
    expect(session.hearts).toBe(5);
    expect(session.firstTryCorrect).toBe(0);
  });

  it('ignore l’appel hors de la phase de réponse', () => {
    const answered = submitAnswer(start(), true);
    expect(completeWithoutHeartCost(answered, 0)).toBe(answered);
  });
});

describe('sessionProgress', () => {
  it('avance quand un exercice est réussi, avant même « Continuer »', () => {
    expect(sessionProgress(start())).toBe(0);
    expect(sessionProgress(submitAnswer(start(), true))).toBeCloseTo(1 / 3);
  });

  it('atteint 100 % à la fin', () => {
    let session = start();
    for (let i = 0; i < 3; i++) session = next(submitAnswer(session, true));
    expect(sessionProgress(session)).toBe(1);
  });
});

describe('summarizeSession', () => {
  it('calcule précision, XP, durée et vies perdues', () => {
    // Préparer : une erreur sur le premier exercice, les deux autres justes
    let session = retry(submitAnswer(start(), false));
    session = next(submitAnswer(session, true));
    session = next(submitAnswer(session, true));
    session = next(submitAnswer(session, true));
    // Agir
    const result = summarizeSession(session, T0 + 168_000);
    // Vérifier
    expect(result.accuracy).toBeCloseTo(2 / 3);
    expect(result.xp).toBe(LESSON_XP);
    expect(result.durationMs).toBe(168_000);
    expect(result.heartsLost).toBe(1);
  });

  it('donne le bonus d’XP pour un sans-faute', () => {
    let session = start();
    for (let i = 0; i < 3; i++) session = next(submitAnswer(session, true));
    expect(summarizeSession(session, T0).xp).toBe(LESSON_XP + ACCURACY_BONUS_XP);
  });

  it('ne donne jamais une durée négative', () => {
    expect(summarizeSession(start(), T0 - 1000).durationMs).toBe(0);
  });
});
