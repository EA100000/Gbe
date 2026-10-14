import type { Rng } from './random';
import { shuffleAwayFromOriginal } from './random';

export type PairSide = 'left' | 'right';

/**
 * Plateau de l'exercice « paires ».
 * Chaque paire est désignée par son indice dans l'exercice ;
 * la colonne de gauche montre le fon, celle de droite le français.
 */
export interface PairsBoard {
  left: readonly number[];
  right: readonly number[];
  matched: readonly number[];
  selected: { side: PairSide; pair: number } | null;
  /** Dernière association fausse, pour l'afficher en rouge. */
  wrong: { left: number; right: number } | null;
  mistakes: number;
}

export type PairsTapResult = 'selected' | 'unselected' | 'match' | 'mismatch' | 'ignored';

export function createPairsBoard(pairCount: number, rng: Rng): PairsBoard {
  const indices = Array.from({ length: pairCount }, (_, i) => i);
  return {
    left: shuffleAwayFromOriginal(indices, rng),
    right: shuffleAwayFromOriginal(indices, rng),
    matched: [],
    selected: null,
    wrong: null,
    mistakes: 0,
  };
}

/**
 * Touche une case. Si une case de l'autre colonne est déjà sélectionnée,
 * on vérifie l'association ; sinon on sélectionne (ou désélectionne).
 */
export function tapPair(
  board: PairsBoard,
  side: PairSide,
  pair: number,
): { board: PairsBoard; result: PairsTapResult } {
  const column = side === 'left' ? board.left : board.right;
  if (!column.includes(pair) || board.matched.includes(pair)) {
    return { board, result: 'ignored' };
  }

  const selected = board.selected;
  if (selected === null || selected.side === side) {
    const unselect = selected?.pair === pair;
    return {
      board: { ...board, selected: unselect ? null : { side, pair }, wrong: null },
      result: unselect ? 'unselected' : 'selected',
    };
  }

  if (selected.pair === pair) {
    return {
      board: { ...board, matched: [...board.matched, pair], selected: null, wrong: null },
      result: 'match',
    };
  }

  const wrong =
    side === 'left' ? { left: pair, right: selected.pair } : { left: selected.pair, right: pair };
  return {
    board: { ...board, selected: null, wrong, mistakes: board.mistakes + 1 },
    result: 'mismatch',
  };
}

export function isBoardComplete(board: PairsBoard): boolean {
  return board.matched.length === board.left.length;
}
