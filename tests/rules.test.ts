import { describe, expect, test } from 'bun:test';
import { applyMove, createGame, legalMoves, MAX_PIECES, positionKey, vanishingCell } from '../src/lib/game/rules';
import type { GameState } from '../src/lib/game/types';

const play = (moves: number[], starter: 'X' | 'O' = 'X'): GameState =>
  moves.reduce((s, m) => applyMove(s, m), createGame(starter));

describe('R1 — basic rules', () => {
  test('new game is empty with the starter to move', () => {
    const s = createGame('O');
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.turn).toBe('O');
    expect(s.winner).toBeNull();
    expect(legalMoves(s)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('a move places the piece and passes the turn', () => {
    const s = applyMove(createGame(), 4);
    expect(s.board[4]).toBe('X');
    expect(s.turn).toBe('O');
    expect(s.queues.X).toEqual([4]);
  });

  test('occupied, out-of-range and non-integer cells are ignored', () => {
    const s = applyMove(createGame(), 4);
    expect(applyMove(s, 4)).toBe(s);
    expect(applyMove(s, -1)).toBe(s);
    expect(applyMove(s, 9)).toBe(s);
    expect(applyMove(s, 1.5)).toBe(s);
  });

  test.each([
    [[0, 3, 1, 4, 2], [0, 1, 2]],
    [[0, 1, 3, 2, 6], [0, 3, 6]],
    [[0, 1, 4, 2, 8], [0, 4, 8]],
    [[2, 0, 4, 1, 6], [2, 4, 6]],
  ])('three in a row wins (%j)', (moves, line) => {
    const s = play(moves);
    expect(s.winner).toBe('X');
    expect(s.line).toEqual(line);
    expect(s.turn).toBe('X');
  });

  test('no move is accepted after the game ends', () => {
    const s = play([0, 3, 1, 4, 2]);
    expect(legalMoves(s)).toEqual([]);
    expect(applyMove(s, 5)).toBe(s);
  });
});

describe('R2 — vanishing rule', () => {
  test('the 4th piece removes the mover’s oldest piece', () => {
    // X: 0, 8, 1 ; O: 5, 6, 7 ; X plays 3 → X's 0 vanishes.
    const s = play([0, 5, 8, 6, 1, 7, 3]);
    expect(s.board[0]).toBeNull();
    expect(s.queues.X).toEqual([8, 1, 3]);
    expect(s.lastRemoved).toEqual({ cell: 0, player: 'X' });
    expect(s.queues.O).toEqual([5, 6, 7]);
  });

  test('never more than 3 pieces per side across a long game', () => {
    let s = createGame();
    let rnd = 7;
    for (let i = 0; i < 300 && !s.winner; i++) {
      const moves = legalMoves(s);
      rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;
      s = applyMove(s, moves[rnd % moves.length]);
      for (const p of ['X', 'O'] as const) {
        expect(s.queues[p].length).toBeLessThanOrEqual(MAX_PIECES);
        expect(s.board.filter((c) => c === p).length).toBe(s.queues[p].length);
      }
    }
  });

  test('the vanishing piece does not count towards a win', () => {
    // X: 0, 1, 7 (0 oldest) ; O: 4, 5, 8. X plays 2: 0 vanishes before the check → no 0-1-2 win.
    const s = play([0, 4, 1, 5, 7, 8, 2]);
    expect(s.board[0]).toBeNull();
    expect(s.winner).toBeNull();
  });

  test('a win with the three remaining pieces counts after the oldest vanishes', () => {
    // X: 8, 0, 1 ; O: 4, 5, 6 ; X plays 2 → 8 vanishes, 0-1-2 remains.
    const s = play([8, 4, 0, 5, 1, 6, 2]);
    expect(s.board[8]).toBeNull();
    expect(s.winner).toBe('X');
    expect(s.line).toEqual([0, 1, 2]);
  });

  test('cannot play on the cell of your own vanishing piece', () => {
    const s = play([0, 5, 8, 6, 1, 7]);
    expect(vanishingCell(s)).toBe(0);
    expect(applyMove(s, 0)).toBe(s);
  });

  test('vanishingCell is null until the mover has 3 pieces', () => {
    expect(vanishingCell(play([0, 5]))).toBeNull();
    expect(vanishingCell(play([0, 5, 8, 6, 1]))).toBeNull();
    expect(vanishingCell(play([0, 5, 8, 6, 1, 7]))).toBe(0);
    expect(vanishingCell(play([0, 5, 8, 6, 1, 7, 3]))).toBe(5);
  });
});

describe('R3 — draw by threefold repetition', () => {
  // X cycles through {0,1,5,6}, O through {2,3,7,8}: neither set contains a line,
  // so after the setup every 8 plies recreate the exact same position.
  const setup = [0, 2, 1, 3, 5, 7];
  const cycle = [6, 8, 0, 2, 1, 3, 5, 7];

  test('the position repeats without anyone winning', () => {
    let s = play(setup);
    const key = positionKey(s.board, s.queues, s.turn);
    for (const m of cycle) s = applyMove(s, m);
    expect(s.winner).toBeNull();
    expect(positionKey(s.board, s.queues, s.turn)).toBe(key);
    expect(s.history[key]).toBe(2);
  });

  test('the draw is declared exactly on the third occurrence', () => {
    let s = play(setup);
    const moves = [...cycle, ...cycle];
    moves.forEach((m, i) => {
      s = applyMove(s, m);
      expect(s.winner).toBe(i === moves.length - 1 ? 'D' : null);
    });
    expect(legalMoves(s)).toEqual([]);
  });
});
