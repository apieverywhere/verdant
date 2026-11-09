import { describe, expect, test } from 'bun:test';
import { chooseMove } from '../src/lib/tidepool/ai';
import { HARD_NODES, searchMove } from '../src/lib/tidepool/search';
import type { Difficulty } from '../src/lib/game/types';
import { initialMatch, isAiTurn, matchReducer } from '../src/lib/tidepool/match';
import {
  allMoves, applyMove, CELL_COUNT, CELLS, cellName, createGame, lineOf, movesForGroup, NB, START_MARBLES,
  type Move, type TidepoolState,
} from '../src/lib/tidepool/rules';
import type { Cell, Player } from '../src/lib/game/types';

const at = (q: number, r: number) => CELLS.findIndex((c) => c.q === q && c.r === r);
const noNoise = () => 0;

/** A state with only the given marbles on the board. */
function custom(marbles: [number, number, Player][], turn: Player = 'X', lost = { X: 0, O: 0 }): TidepoolState {
  const board: Cell[] = Array(CELL_COUNT).fill(null), ids = Array(CELL_COUNT).fill(-1), owners: Player[] = [];
  for (const [q, r, p] of marbles) {
    const i = at(q, r);
    board[i] = p;
    ids[i] = owners.length;
    owners.push(p);
  }
  return { board, ids, owners, turn, lost, winner: null, last: null, moveCount: 0, history: {} };
}

const find = (s: TidepoolState, group: number[], dir: number): Move | undefined =>
  movesForGroup(s.board, lineOf(group)!, s.turn).find((m) => m.dir === dir);

describe('board', () => {
  test('61 holes in a radius-4 hexagon with consistent neighbours', () => {
    expect(CELL_COUNT).toBe(61);
    CELLS.forEach((_, i) => NB[i].forEach((j, d) => { if (j >= 0) expect(NB[j][(d + 3) % 6]).toBe(i); }));
    expect(CELLS.filter((c) => c.ring === 4).length).toBe(24);
  });

  test('each side starts with 14 marbles, Pearl near, Coral far, mirrored', () => {
    const s = createGame();
    expect(s.board.filter((p) => p === 'X').length).toBe(START_MARBLES);
    expect(s.board.filter((p) => p === 'O').length).toBe(START_MARBLES);
    s.board.forEach((p, i) => { if (p) expect(s.board[at(-CELLS[i].q, -CELLS[i].r)]).toBe(p === 'X' ? 'O' : 'X'); });
    expect(new Set(s.ids.filter((id) => id >= 0)).size).toBe(28);
  });

  test('cell names count rows from the far side', () => {
    expect(cellName(at(0, -4))).toBe('row 1, hole 1');
    expect(cellName(at(0, 0))).toBe('row 5, hole 5');
    expect(cellName(at(0, 4))).toBe('row 9, hole 5');
  });
});

describe('selection lines', () => {
  test('accepts 1–3 contiguous marbles in a straight line, in any click order', () => {
    expect(lineOf([at(0, 0)])).toEqual([at(0, 0)]);
    expect(lineOf([at(2, 0), at(0, 0), at(1, 0)])).toEqual([at(0, 0), at(1, 0), at(2, 0)]);
    expect(lineOf([at(0, 0), at(0, 1)])).not.toBeNull();
  });
  test('rejects gaps, bends and more than three', () => {
    expect(lineOf([at(0, 0), at(2, 0)])).toBeNull();
    expect(lineOf([at(0, 0), at(1, 0), at(1, 1)])).toBeNull();
    expect(lineOf([at(0, 0), at(1, 0), at(2, 0), at(3, 0)])).toBeNull();
    expect(lineOf([])).toBeNull();
  });
});

describe('moves', () => {
  test('a single marble moves into any empty neighbour', () => {
    const s = custom([[0, 0, 'X']]);
    expect(movesForGroup(s.board, [at(0, 0)], 'X').length).toBe(6);
    const n = applyMove(s, find(s, [at(0, 0)], 0)!);
    expect(n.board[at(1, 0)]).toBe('X');
    expect(n.board[at(0, 0)]).toBeNull();
    expect(n.turn).toBe('O');
    expect(n.ids[at(1, 0)]).toBe(0);
  });

  test('a line steps sideways only into empty holes, and never pushes', () => {
    const s = custom([[0, 0, 'X'], [1, 0, 'X'], [0, 1, 'O']]);
    const line = lineOf([at(0, 0), at(1, 0)])!;
    const side = movesForGroup(s.board, line, 'X').filter((m) => m.lead < 0);
    // SE and SW both need the hole at (0,1), which Coral holds; NE and NW are open
    expect(side.map((m) => m.dir).sort()).toEqual([1, 2]);
    const n = applyMove(s, side.find((m) => m.dir === 2)!);
    expect(n.board[at(0, -1)]).toBe('X');
    expect(n.board[at(1, -1)]).toBe('X');
  });

  test('3 push 2 along the line; equal numbers cannot push', () => {
    const s = custom([[-3, 0, 'X'], [-2, 0, 'X'], [-1, 0, 'X'], [0, 0, 'O'], [1, 0, 'O']]);
    const push = find(s, [at(-3, 0), at(-2, 0), at(-1, 0)], 0)!;
    expect(push.push).toBe(2);
    const n = applyMove(s, push);
    expect([-2, -1, 0].map((q) => n.board[at(q, 0)])).toEqual(['X', 'X', 'X']);
    expect([1, 2].map((q) => n.board[at(q, 0)])).toEqual(['O', 'O']);
    expect(n.last!.shifts.filter((x) => x.pushed).length).toBe(2);

    const even = custom([[-2, 0, 'X'], [-1, 0, 'X'], [0, 0, 'O'], [1, 0, 'O']]);
    expect(find(even, [at(-2, 0), at(-1, 0)], 0)).toBeUndefined();
  });

  test('a push blocked by one of your own marbles is not allowed', () => {
    const s = custom([[-2, 0, 'X'], [-1, 0, 'X'], [0, 0, 'O'], [1, 0, 'X']]);
    expect(find(s, [at(-2, 0), at(-1, 0)], 0)).toBeUndefined();
  });

  test('pushing past the edge sends the marble to the tray and counts it', () => {
    const s = custom([[2, 0, 'X'], [3, 0, 'X'], [4, 0, 'O']]);
    const mv = find(s, [at(2, 0), at(3, 0)], 0)!;
    expect(mv.off).toBe(true);
    const n = applyMove(s, mv);
    expect(n.lost.O).toBe(1);
    expect(n.board.filter((p) => p === 'O').length).toBe(0);
    expect(n.last!.off).toEqual({ id: 2, from: at(4, 0), slot: 0 });
  });

  test('the sixth marble pushed off wins, and the game then ignores moves', () => {
    const s = custom([[2, 0, 'X'], [3, 0, 'X'], [4, 0, 'O'], [-4, 0, 'O']], 'X', { X: 0, O: 5 });
    const n = applyMove(s, find(s, [at(2, 0), at(3, 0)], 0)!);
    expect(n.winner).toBe('X');
    expect(applyMove(n, allMoves(n.board, n.turn)[0])).toBe(n);
  });

  test('illegal moves return the same state', () => {
    const s = createGame();
    const coral = s.board.indexOf('O');
    expect(applyMove(s, { group: [coral], dir: 0, push: 0, lead: coral, off: false })).toBe(s);
    const pearl = s.board.indexOf('X');
    expect(applyMove(s, { group: [pearl], dir: 5, push: 0, lead: pearl, off: false })).toBe(s); // off the board
  });

  test('positions are counted, so going back and forth is visible to the computer', () => {
    let s = createGame();
    const there = allMoves(s.board, 'X').find((m) => m.group.length === 1 && m.lead >= 0)!;
    s = applyMove(s, there);
    const coral = allMoves(s.board, 'O').find((m) => m.group.length === 1 && m.lead >= 0)!;
    s = applyMove(s, coral);
    const back = (st: TidepoolState, mv: Move) => movesForGroup(st.board, [NB[mv.group[0]][mv.dir]], st.turn).find((m) => m.dir === (mv.dir + 3) % 6)!;
    s = applyMove(s, back(s, there));
    s = applyMove(s, back(s, coral));
    expect(Object.values(s.history).reduce((a, b) => a + b, 0)).toBe(5);
    expect(Math.max(...Object.values(s.history))).toBe(2); // the opening position came back
  });

  test('the opening position has legal moves and all of them apply', () => {
    const s = createGame();
    const moves = allMoves(s.board, 'X');
    expect(moves.length).toBeGreaterThan(20);
    for (const m of moves) expect(applyMove(s, m)).not.toBe(s);
  });
});

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

describe('computer', () => {
  test('every level returns a legal move from the opening', () => {
    for (const level of LEVELS) {
      const s = createGame('O');
      const mv = chooseMove(s, level, noNoise)!;
      expect(applyMove(s, mv)).not.toBe(s);
    }
  });

  test('medium and hard take a winning push when one exists', () => {
    const s = custom([[2, 0, 'O'], [3, 0, 'O'], [4, 0, 'X'], [-4, 4, 'X'], [0, -4, 'O']], 'O', { X: 5, O: 0 });
    for (const level of ['medium', 'hard'] as const) expect(applyMove(s, chooseMove(s, level, noNoise)!).winner).toBe('O');
  });

  test('medium and hard move a marble away from an immediate push off the edge', () => {
    // Pearl threatens to push the lone Coral marble on the rim with two marbles.
    const s = custom([[4, -2, 'O'], [2, -2, 'X'], [3, -2, 'X'], [-3, 3, 'X'], [-2, -1, 'O']], 'O');
    for (const level of ['medium', 'hard'] as const) {
      const n = applyMove(s, chooseMove(s, level, noNoise)!);
      expect(allMoves(n.board, 'X').some((m) => m.off)).toBe(false);
    }
  });

  test('hard sees a push-off two moves ahead', () => {
    // Coral can line up a third marble now and push the Pearl rim marble off next turn; Pearl cannot escape in time
    // because its only marble is boxed in on the rim.
    const s = custom([[4, -1, 'X'], [3, -1, 'O'], [2, -1, 'O'], [0, -1, 'O'], [4, -4, 'X'], [-4, 4, 'X']], 'O', { X: 5, O: 0 });
    const r = searchMove(s, noNoise);
    expect(r.score).toBeGreaterThan(900_000);
  });

  test('hard search stays within its node budget and reports its depth', () => {
    const r = searchMove(createGame('X'), noNoise);
    expect(r.depth).toBeGreaterThanOrEqual(3);
    expect(r.nodes).toBeLessThanOrEqual(HARD_NODES + 1);
  });
});

describe('match', () => {
  test('selection toggles marbles, keeps lines and restarts on a bend', () => {
    let m = initialMatch();
    const a = at(-2, 2), b = at(-1, 2), c = at(-2, 3);
    m = matchReducer(m, { type: 'select', cell: a });
    m = matchReducer(m, { type: 'select', cell: b });
    expect(m.sel).toEqual([a, b]);
    m = matchReducer(m, { type: 'select', cell: c });
    expect(m.sel).toEqual([c]);
    m = matchReducer(m, { type: 'select', cell: c });
    expect(m.sel).toEqual([]);
    m = matchReducer(m, { type: 'select', cell: at(0, -4) }); // opponent's marble does nothing
    expect(m.sel).toEqual([]);
  });

  test('changing the difficulty starts a new board and clears wins', () => {
    let m = { ...initialMatch('ai'), wins: { X: 1, O: 1 } };
    expect(m.difficulty).toBe('hard');
    m = matchReducer(m, { type: 'setDifficulty', difficulty: 'easy' });
    expect(m.difficulty).toBe('easy');
    expect(m.wins).toEqual({ X: 0, O: 0 });
    expect(m.gameId).toBe(1);
  });

  test('a move clears the selection and passes the turn; the AI plays only on its turn', () => {
    let m = initialMatch('ai');
    const human = allMoves(m.game.board, 'X')[0];
    expect(matchReducer(m, { type: 'move', move: human, source: 'ai' })).toBe(m);
    m = matchReducer(m, { type: 'select', cell: human.group[0] });
    m = matchReducer(m, { type: 'move', move: human, source: 'human' });
    expect(m.sel).toEqual([]);
    expect(isAiTurn(m)).toBe(true);
    expect(matchReducer(m, { type: 'select', cell: m.game.board.indexOf('O') })).toBe(m);
  });

  test('starters alternate; reset and mode change restart with Pearl and clear wins', () => {
    let m = initialMatch();
    m = matchReducer(m, { type: 'newGame' });
    expect(m.game.turn).toBe('O');
    expect(m.gameId).toBe(1);
    m = matchReducer(m, { type: 'newGame' });
    expect(m.game.turn).toBe('X');
    m = { ...m, wins: { X: 2, O: 1 } };
    m = matchReducer(m, { type: 'resetScores' });
    expect(m.wins).toEqual({ X: 0, O: 0 });
    m = matchReducer(m, { type: 'setMode', mode: 'ai' });
    expect(m.mode).toBe('ai');
    expect(m.game.turn).toBe('X');
  });
});
