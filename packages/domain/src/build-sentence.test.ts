import {
  answerWords,
  clearAnswer,
  createSentenceBoard,
  gradeSentenceBoard,
  placeTile,
  removeTile,
  type SentenceBoard,
} from './build-sentence';
import { createRng } from './random';

const exercise = { solution: ['m1', 'm2', 'm3'], distractors: ['d1', 'd2'] };

function tileId(board: SentenceBoard, text: string): number {
  const tile = board.bank.find((t) => t.text === text);
  if (tile === undefined) throw new Error(`Tuile absente : ${text}`);
  return tile.id;
}

function placeWords(board: SentenceBoard, words: string[]): SentenceBoard {
  return words.reduce((b, w) => placeTile(b, tileId(b, w)), board);
}

describe('createSentenceBoard', () => {
  it('met la solution et les distracteurs dans la banque, réponse vide', () => {
    const board = createSentenceBoard(exercise, createRng(3));
    expect(board.bank.map((t) => t.text).sort()).toEqual(['d1', 'd2', 'm1', 'm2', 'm3']);
    expect(board.answer).toEqual([]);
  });

  it('ne présente pas les mots dans l’ordre de la solution', () => {
    const board = createSentenceBoard(exercise, createRng(3));
    expect(board.bank.map((t) => t.text)).not.toEqual(['m1', 'm2', 'm3', 'd1', 'd2']);
  });

  it('distingue deux tuiles portant le même mot', () => {
    const board = createSentenceBoard({ solution: ['a', 'a'], distractors: [] }, createRng(1));
    expect(new Set(board.bank.map((t) => t.id)).size).toBe(2);
  });
});

describe('placeTile et removeTile', () => {
  it('ajoute les tuiles dans l’ordre où elles sont touchées', () => {
    const board = placeWords(createSentenceBoard(exercise, createRng(5)), ['m2', 'm1']);
    expect(answerWords(board)).toEqual(['m2', 'm1']);
  });

  it('ignore une tuile déjà placée', () => {
    const board = placeWords(createSentenceBoard(exercise, createRng(5)), ['m1']);
    expect(placeTile(board, tileId(board, 'm1'))).toBe(board);
  });

  it('ignore une tuile inconnue', () => {
    const board = createSentenceBoard(exercise, createRng(5));
    expect(placeTile(board, 99)).toBe(board);
  });

  it('retire une tuile placée et garde l’ordre des autres', () => {
    const board = placeWords(createSentenceBoard(exercise, createRng(5)), ['m1', 'm2', 'm3']);
    expect(answerWords(removeTile(board, tileId(board, 'm2')))).toEqual(['m1', 'm3']);
  });

  it('ignore le retrait d’une tuile qui n’est pas dans la réponse', () => {
    const board = createSentenceBoard(exercise, createRng(5));
    expect(removeTile(board, 0)).toBe(board);
  });

  it('vide la réponse pour réessayer', () => {
    const board = placeWords(createSentenceBoard(exercise, createRng(5)), ['m1']);
    expect(clearAnswer(board).answer).toEqual([]);
  });
});

describe('gradeSentenceBoard', () => {
  it('juge juste la solution complète', () => {
    const board = placeWords(createSentenceBoard(exercise, createRng(8)), ['m1', 'm2', 'm3']);
    expect(gradeSentenceBoard(board, exercise).correct).toBe(true);
  });

  it('juge faux une réponse avec un distracteur', () => {
    const board = placeWords(createSentenceBoard(exercise, createRng(8)), ['m1', 'd1', 'm3']);
    expect(gradeSentenceBoard(board, exercise).correct).toBe(false);
  });
});
