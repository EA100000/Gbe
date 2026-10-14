import type { BuildSentenceExercise } from '@gbe/content-schema';

import { gradeBuildSentence, type Grade } from './grading';
import type { Rng } from './random';
import { shuffleAwayFromOriginal } from './random';

/** Une tuile de la banque de mots. L'identifiant distingue deux mots identiques. */
export interface WordTile {
  id: number;
  text: string;
}

export interface SentenceBoard {
  /** Banque de mots dans l'ordre d'affichage (mélangé). */
  bank: readonly WordTile[];
  /** Identifiants des tuiles placées dans la réponse, dans l'ordre. */
  answer: readonly number[];
}

/** Prépare la banque : solution et distracteurs mélangés. */
export function createSentenceBoard(
  exercise: Pick<BuildSentenceExercise, 'solution' | 'distractors'>,
  rng: Rng,
): SentenceBoard {
  const tiles = [...exercise.solution, ...exercise.distractors].map((text, id) => ({ id, text }));
  return { bank: shuffleAwayFromOriginal(tiles, rng), answer: [] };
}

/** Ajoute une tuile à la réponse (sans effet si elle y est déjà ou n'existe pas). */
export function placeTile(board: SentenceBoard, tileId: number): SentenceBoard {
  const exists = board.bank.some((t) => t.id === tileId);
  if (!exists || board.answer.includes(tileId)) return board;
  return { ...board, answer: [...board.answer, tileId] };
}

/** Retire une tuile de la réponse ; elle redevient disponible dans la banque. */
export function removeTile(board: SentenceBoard, tileId: number): SentenceBoard {
  if (!board.answer.includes(tileId)) return board;
  return { ...board, answer: board.answer.filter((id) => id !== tileId) };
}

/** Vide la réponse, pour réessayer. */
export function clearAnswer(board: SentenceBoard): SentenceBoard {
  return { ...board, answer: [] };
}

/** Texte des tuiles placées, dans l'ordre de la réponse. */
export function answerWords(board: SentenceBoard): string[] {
  const byId = new Map(board.bank.map((t) => [t.id, t.text]));
  return board.answer.map((id) => byId.get(id) ?? '');
}

export function gradeSentenceBoard(
  board: SentenceBoard,
  exercise: Pick<BuildSentenceExercise, 'solution'>,
): Grade {
  return gradeBuildSentence(answerWords(board), exercise.solution);
}
