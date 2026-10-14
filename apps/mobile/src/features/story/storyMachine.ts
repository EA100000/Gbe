import type { StoryExercise } from '@gbe/content-schema';
import { gradeStoryChoice } from '@gbe/domain';

/** État de l'histoire (écran 7) : répliques écoutées, réponse choisie, traduction affichée. */
export interface StoryViewState {
  showTranslation: boolean;
  listened: readonly number[];
  /** Dernière réplique fausse choisie, pour afficher son explication. */
  wrongChoice: number | null;
  solved: boolean;
  attempts: number;
}

export const initialStoryState: StoryViewState = {
  showTranslation: true,
  listened: [],
  wrongChoice: null,
  solved: false,
  attempts: 0,
};

export function toggleTranslation(state: StoryViewState): StoryViewState {
  return { ...state, showTranslation: !state.showTranslation };
}

export function markListened(state: StoryViewState, line: number): StoryViewState {
  return state.listened.includes(line) ? state : { ...state, listened: [...state.listened, line] };
}

export function pickReply(
  state: StoryViewState,
  exercise: Pick<StoryExercise, 'question'>,
  choiceIndex: number,
): StoryViewState {
  if (state.solved) return state;
  const { correct } = gradeStoryChoice(exercise, choiceIndex);
  return {
    ...state,
    attempts: state.attempts + 1,
    solved: correct,
    wrongChoice: correct ? null : choiceIndex,
  };
}

/** Avancement : part des répliques audio écoutées, et 100 % une fois l'histoire réussie. */
export function storyProgress(
  state: StoryViewState,
  exercise: Pick<StoryExercise, 'lines'>,
): number {
  if (state.solved) return 1;
  const withAudio = exercise.lines.filter((l) => l.audio !== undefined).length;
  if (withAudio === 0) return 0;
  return (state.listened.length / withAudio) * 0.9;
}

/** Précision de l'histoire : réussie du premier coup ou non. */
export function storyAccuracy(state: StoryViewState): number {
  return state.solved && state.attempts === 1 ? 1 : 0;
}
