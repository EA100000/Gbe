import type { ImageChoiceExercise, StoryExercise } from '@gbe/content-schema';

import { fonEquals } from './fon';

export interface Grade {
  correct: boolean;
}

/** Choix d'image : juste si l'élément choisi est la réponse attendue. */
export function gradeImageChoice(
  exercise: Pick<ImageChoiceExercise, 'answer'>,
  selectedItemId: string | null,
): Grade {
  return { correct: selectedItemId !== null && selectedItemId === exercise.answer };
}

/**
 * Phrase à construire : juste si les mots sont les mêmes, dans le même ordre.
 * La comparaison passe par la normalisation NFC : un ton combiné ou précomposé
 * donne le même mot. Les tons comptent toujours.
 */
export function gradeBuildSentence(given: readonly string[], expected: readonly string[]): Grade {
  if (given.length !== expected.length) return { correct: false };
  return { correct: given.every((word, i) => fonEquals(word, expected[i] ?? '')) };
}

export interface StoryGrade extends Grade {
  /** Réplique choisie, pour afficher son explication. */
  choice: StoryExercise['question']['choices'][number] | null;
}

/** Histoire : juste si la réplique choisie est marquée comme la bonne. */
export function gradeStoryChoice(
  exercise: Pick<StoryExercise, 'question'>,
  choiceIndex: number,
): StoryGrade {
  const choice = exercise.question.choices[choiceIndex] ?? null;
  return { correct: choice?.correct === true, choice };
}
