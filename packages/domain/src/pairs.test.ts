import { createPairsBoard, isBoardComplete, tapPair, type PairsBoard } from './pairs';
import { createRng } from './random';

const fresh = (count = 3): PairsBoard => createPairsBoard(count, createRng(11));

describe('createPairsBoard', () => {
  it('mélange les deux colonnes sans perdre de paire', () => {
    const board = fresh(5);
    expect([...board.left].sort()).toEqual([0, 1, 2, 3, 4]);
    expect([...board.right].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(board.left).not.toEqual([0, 1, 2, 3, 4]);
  });
});

describe('tapPair', () => {
  it('sélectionne un mot fon', () => {
    const { board, result } = tapPair(fresh(), 'left', 1);
    expect(result).toBe('selected');
    expect(board.selected).toEqual({ side: 'left', pair: 1 });
  });

  it('désélectionne un mot touché deux fois', () => {
    const first = tapPair(fresh(), 'left', 1).board;
    const { board, result } = tapPair(first, 'left', 1);
    expect(result).toBe('unselected');
    expect(board.selected).toBeNull();
  });

  it('remplace la sélection quand on touche un autre mot de la même colonne', () => {
    const first = tapPair(fresh(), 'left', 1).board;
    expect(tapPair(first, 'left', 2).board.selected).toEqual({ side: 'left', pair: 2 });
  });

  it('valide une paire juste', () => {
    const first = tapPair(fresh(), 'left', 2).board;
    const { board, result } = tapPair(first, 'right', 2);
    expect(result).toBe('match');
    expect(board.matched).toEqual([2]);
    expect(board.selected).toBeNull();
  });

  it('valide aussi en commençant par la traduction', () => {
    const first = tapPair(fresh(), 'right', 0).board;
    expect(tapPair(first, 'left', 0).result).toBe('match');
  });

  it('refuse une paire fausse, la montre et compte une erreur', () => {
    const first = tapPair(fresh(), 'left', 0).board;
    const { board, result } = tapPair(first, 'right', 1);
    expect(result).toBe('mismatch');
    expect(board.wrong).toEqual({ left: 0, right: 1 });
    expect(board.mistakes).toBe(1);
  });

  it('range la paire fausse dans le bon ordre quand on commence par la traduction', () => {
    const first = tapPair(fresh(), 'right', 2).board;
    expect(tapPair(first, 'left', 0).board.wrong).toEqual({ left: 0, right: 2 });
  });

  it('efface l’erreur affichée dès la sélection suivante', () => {
    const wrong = tapPair(tapPair(fresh(), 'left', 0).board, 'right', 1).board;
    expect(tapPair(wrong, 'left', 2).board.wrong).toBeNull();
  });

  it('ignore une paire déjà trouvée', () => {
    const matched = tapPair(tapPair(fresh(), 'left', 1).board, 'right', 1).board;
    const { board, result } = tapPair(matched, 'left', 1);
    expect(result).toBe('ignored');
    expect(board).toBe(matched);
  });

  it('ignore un indice inexistant', () => {
    expect(tapPair(fresh(), 'left', 9).result).toBe('ignored');
  });
});

describe('isBoardComplete', () => {
  it('est faux tant qu’il reste des paires', () => {
    expect(isBoardComplete(fresh())).toBe(false);
  });

  it('est vrai quand toutes les paires sont trouvées', () => {
    const board = [0, 1, 2].reduce(
      (b, pair) => tapPair(tapPair(b, 'left', pair).board, 'right', pair).board,
      fresh(),
    );
    expect(isBoardComplete(board)).toBe(true);
  });
});

describe('paires ratées', () => {
  it('retient une fois le mot fon mal associé', () => {
    let board = fresh();
    board = tapPair(board, 'left', 0).board;
    board = tapPair(board, 'right', 1).board;
    board = tapPair(board, 'right', 2).board;
    board = tapPair(board, 'left', 0).board;

    expect(board.missed).toEqual([0]);
    expect(board.mistakes).toBe(2);
  });
});
