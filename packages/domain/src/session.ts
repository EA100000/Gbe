import { computeAccuracy, lessonXp } from './xp';

/**
 * Déroulé d'une leçon, comme dans la maquette :
 * - réponse juste : panneau bleu, puis « Continuer » passe à l'exercice suivant ;
 * - réponse fausse : une vie en moins, panneau rouge, puis « Réessayer » le même exercice ;
 * - plus de vie : la leçon s'arrête.
 */
export type SessionPhase = 'answering' | 'correct' | 'wrong' | 'finished' | 'out_of_hearts';

export interface LessonSession {
  exerciseIds: readonly string[];
  index: number;
  phase: SessionPhase;
  hearts: number;
  /** Nombre de réponses fausses par exercice. */
  wrongAttempts: Readonly<Record<string, number>>;
  firstTryCorrect: number;
  heartsLost: number;
  startedAt: number;
  /** Faux : séance d'entraînement, une erreur ne coûte pas de vie (ADR 0019). */
  heartCost: boolean;
  /** Exercices déjà renvoyés en fin de séance après une erreur (une fois chacun). */
  postponed: readonly string[];
}

export interface LessonResult {
  accuracy: number;
  xp: number;
  durationMs: number;
  heartsLost: number;
}

export function startSession(
  exerciseIds: readonly string[],
  hearts: number,
  startedAt: number,
  options: { heartCost?: boolean } = {},
): LessonSession {
  if (exerciseIds.length === 0) throw new Error('Une leçon doit contenir au moins un exercice');
  const heartCost = options.heartCost ?? true;
  return {
    exerciseIds,
    index: 0,
    phase: hearts > 0 || !heartCost ? 'answering' : 'out_of_hearts',
    heartCost,
    postponed: [],
    hearts,
    wrongAttempts: {},
    firstTryCorrect: 0,
    heartsLost: 0,
    startedAt,
  };
}

export function currentExerciseId(session: LessonSession): string | undefined {
  return session.exerciseIds[session.index];
}

function wrongCount(session: LessonSession, id: string): number {
  return session.wrongAttempts[id] ?? 0;
}

/** Enregistre une réponse corrigée (choix d'image, phrase à construire). */
export function submitAnswer(session: LessonSession, correct: boolean): LessonSession {
  const id = currentExerciseId(session);
  if (session.phase !== 'answering' || id === undefined) return session;

  if (correct) {
    const firstTry = wrongCount(session, id) === 0;
    return {
      ...session,
      phase: 'correct',
      firstTryCorrect: session.firstTryCorrect + (firstTry ? 1 : 0),
    };
  }

  const wrongAttempts = { ...session.wrongAttempts, [id]: wrongCount(session, id) + 1 };
  if (!session.heartCost) return { ...session, phase: 'wrong', wrongAttempts };
  const hearts = Math.max(0, session.hearts - 1);
  return {
    ...session,
    phase: hearts === 0 ? 'out_of_hearts' : 'wrong',
    hearts,
    heartsLost: session.heartsLost + 1,
    wrongAttempts,
  };
}

/**
 * Termine un exercice de paires. Une erreur d'association ne coûte pas de vie
 * (la maquette ne l'annonce pas sur cet écran) mais compte dans la précision.
 */
export function completeWithoutHeartCost(session: LessonSession, mistakes: number): LessonSession {
  const id = currentExerciseId(session);
  if (session.phase !== 'answering' || id === undefined) return session;
  const perfect = mistakes === 0 && wrongCount(session, id) === 0;
  return {
    ...session,
    phase: 'correct',
    firstTryCorrect: session.firstTryCorrect + (perfect ? 1 : 0),
  };
}

/** Après une erreur : on retente le même exercice. */
export function retry(session: LessonSession): LessonSession {
  return session.phase === 'wrong' ? { ...session, phase: 'answering' } : session;
}

/**
 * Séance d'entraînement, après une erreur : on continue, et l'exercice raté revient en fin de
 * séance (une seule fois ; la seconde erreur passe simplement à la suite).
 */
export function postpone(session: LessonSession): LessonSession {
  const id = currentExerciseId(session);
  if (session.phase !== 'wrong' || session.heartCost || id === undefined) return session;
  if (session.postponed.includes(id)) {
    const index = session.index + 1;
    return index >= session.exerciseIds.length
      ? { ...session, index, phase: 'finished' }
      : { ...session, index, phase: 'answering' };
  }
  const exerciseIds = [...session.exerciseIds.filter((_, i) => i !== session.index), id];
  return { ...session, exerciseIds, phase: 'answering', postponed: [...session.postponed, id] };
}

/** Après une réussite : exercice suivant, ou fin de leçon. */
export function next(session: LessonSession): LessonSession {
  if (session.phase !== 'correct') return session;
  const index = session.index + 1;
  return index >= session.exerciseIds.length
    ? { ...session, index, phase: 'finished' }
    : { ...session, index, phase: 'answering' };
}

/** Avancement de la barre de progression, entre 0 et 1. */
export function sessionProgress(session: LessonSession): number {
  const done = session.index + (session.phase === 'correct' ? 1 : 0);
  return Math.min(1, done / session.exerciseIds.length);
}

/** Bilan affiché sur l'écran « Leçon terminée ». */
export function summarizeSession(session: LessonSession, endedAt: number): LessonResult {
  const accuracy = computeAccuracy(session.firstTryCorrect, session.exerciseIds.length);
  return {
    accuracy,
    xp: lessonXp(accuracy),
    durationMs: Math.max(0, endedAt - session.startedAt),
    heartsLost: session.heartsLost,
  };
}
