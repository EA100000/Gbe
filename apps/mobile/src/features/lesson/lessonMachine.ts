import type {
  BuildSentenceExercise,
  ImageChoiceExercise,
  MatchPairsExercise,
} from '@gbe/content-schema';
import {
  clearAnswer,
  completeWithoutHeartCost,
  createPairsBoard,
  createRng,
  createSentenceBoard,
  currentExerciseId,
  gradeImageChoice,
  gradeSentenceBoard,
  isBoardComplete,
  next,
  placeTile,
  postpone,
  removeTile,
  retry,
  startSession,
  submitAnswer,
  tapPair,
  type LessonSession,
  type PairSide,
  type PairsBoard,
  type SentenceBoard,
} from '@gbe/domain';

/**
 * État de l'écran de leçon, piloté par des actions.
 * Fonctions pures : toute la logique se teste sans React ni téléphone.
 */
/**
 * « Écouter et choisir » (écran 25, ADR 0020) : on entend un mot et on le choisit parmi d'autres.
 * Exercice construit par l'appli pour l'entraînement, jamais lu dans un pack.
 */
export interface ListenChoiceExercise {
  id: string;
  type: 'listen_choice';
  tag?: { kind: 'listen'; labelFr: string };
  promptFr: string;
  /** Audio à vitesse normale du mot à reconnaître, puis lent s'il existe. */
  audio: string;
  slowAudio?: string;
  choices: readonly string[];
  answer: string;
}

/** Exercices d'une leçon du pack que cet écran sait jouer. */
export type PackLessonExercise = ImageChoiceExercise | BuildSentenceExercise | MatchPairsExercise;

export type LessonExercise =
  ImageChoiceExercise | BuildSentenceExercise | MatchPairsExercise | ListenChoiceExercise;

/** Exercices où l'on choisit une réponse parmi plusieurs (images, écoute). */
const isChoice = (
  exercise: LessonExercise | undefined,
): exercise is ImageChoiceExercise | ListenChoiceExercise =>
  exercise?.type === 'image_choice' || exercise?.type === 'listen_choice';

export interface LessonViewState {
  lessonId: string;
  exercises: readonly LessonExercise[];
  session: LessonSession;
  seed: number;
  /** Choix d'image sélectionné (avant ou après « Vérifier »). */
  selectedChoice: string | null;
  sentence: SentenceBoard | null;
  pairs: PairsBoard | null;
}

export type LessonAction =
  | { type: 'select_choice'; itemId: string }
  | { type: 'check' }
  | { type: 'retry' }
  | { type: 'next' }
  | { type: 'postpone' }
  | { type: 'place_tile'; tileId: number }
  | { type: 'remove_tile'; tileId: number }
  | { type: 'tap_pair'; side: PairSide; pair: number };

export function currentExercise(state: LessonViewState): LessonExercise | undefined {
  const id = currentExerciseId(state.session);
  return state.exercises.find((e) => e.id === id);
}

function withBoards(state: LessonViewState): LessonViewState {
  const exercise = currentExercise(state);
  const rng = createRng(state.seed + state.session.index);
  return {
    ...state,
    selectedChoice: null,
    sentence: exercise?.type === 'build_sentence' ? createSentenceBoard(exercise, rng) : null,
    pairs: exercise?.type === 'match_pairs' ? createPairsBoard(exercise.pairs.length, rng) : null,
  };
}

export function startLesson(
  lessonId: string,
  exercises: readonly LessonExercise[],
  hearts: number,
  startedAt: number,
  seed: number,
  options: { heartCost?: boolean } = {},
): LessonViewState {
  const session = startSession(
    exercises.map((e) => e.id),
    hearts,
    startedAt,
    options,
  );
  return withBoards({
    lessonId,
    exercises,
    session,
    seed,
    selectedChoice: null,
    sentence: null,
    pairs: null,
  });
}

/** Le bouton « Vérifier » est-il actif ? */
export function canCheck(state: LessonViewState): boolean {
  const exercise = currentExercise(state);
  if (state.session.phase !== 'answering' || exercise === undefined) return false;
  if (isChoice(exercise)) return state.selectedChoice !== null;
  if (exercise.type === 'build_sentence') return (state.sentence?.answer.length ?? 0) > 0;
  return false;
}

export function lessonReducer(state: LessonViewState, action: LessonAction): LessonViewState {
  const exercise = currentExercise(state);
  const answering = state.session.phase === 'answering';

  switch (action.type) {
    case 'select_choice':
      if (!answering || !isChoice(exercise)) return state;
      return exercise.choices.includes(action.itemId)
        ? { ...state, selectedChoice: action.itemId }
        : state;

    case 'place_tile':
      if (!answering || state.sentence === null) return state;
      return { ...state, sentence: placeTile(state.sentence, action.tileId) };

    case 'remove_tile':
      if (!answering || state.sentence === null) return state;
      return { ...state, sentence: removeTile(state.sentence, action.tileId) };

    case 'check': {
      if (!canCheck(state) || exercise === undefined) return state;
      const correct =
        exercise.type === 'listen_choice'
          ? state.selectedChoice === exercise.answer
          : exercise.type === 'image_choice'
            ? gradeImageChoice(exercise, state.selectedChoice).correct
            : exercise.type === 'build_sentence' && state.sentence !== null
              ? gradeSentenceBoard(state.sentence, exercise).correct
              : false;
      return { ...state, session: submitAnswer(state.session, correct) };
    }

    case 'retry': {
      if (state.session.phase !== 'wrong') return state;
      return {
        ...state,
        session: retry(state.session),
        selectedChoice: null,
        sentence: state.sentence === null ? null : clearAnswer(state.sentence),
      };
    }

    case 'postpone': {
      if (state.session.phase !== 'wrong' || state.session.heartCost) return state;
      return withBoards({ ...state, session: postpone(state.session) });
    }

    case 'next': {
      if (state.session.phase !== 'correct') return state;
      return withBoards({ ...state, session: next(state.session) });
    }

    case 'tap_pair': {
      if (!answering || state.pairs === null) return state;
      const { board } = tapPair(state.pairs, action.side, action.pair);
      const session = isBoardComplete(board)
        ? completeWithoutHeartCost(state.session, board.mistakes)
        : state.session;
      return { ...state, pairs: board, session };
    }
  }
}
