import { describe, expect, test } from 'bun:test';
import { chooseTurn } from '../src/lib/canopy/ai';
import { initialMatch, isAiTurn, matchReducer } from '../src/lib/canopy/match';
import {
  BLOSSOM, CELL_COUNT, cellAt, cellName, createGame, cut, cutTargets, grow, growTargets, hasMove, lanternCount, NB, skipCut, step,
  stepTargets, TREETOP, type CanopyState,
} from '../src/lib/canopy/rules';
import { HARD_NODES, legalTurns, searchTurn, type Turn } from '../src/lib/canopy/search';
import type { Cell, Difficulty, Player } from '../src/lib/game/types';

/** A state with the given tile levels ([col, row, level]) and lanterns ([col, row, owner]); climbers default to the start. */
function custom(
  opts: { levels?: [number, number, number][]; lanterns?: [number, number, Player][]; climbers?: [number, number][]; turn?: Player } = {},
): CanopyState {
  const s = createGame(opts.turn ?? 'X');
  const level = s.level.slice(), lantern: Cell[] = s.lantern.slice();
  for (const [c, r, l] of opts.levels ?? []) level[cellAt(c, r)] = l;
  for (const [c, r, p] of opts.lanterns ?? []) lantern[cellAt(c, r)] = p;
  const climbers = opts.climbers ? opts.climbers.map(([c, r]) => cellAt(c, r)) : s.climbers;
  return { ...s, level, lantern, climbers };
}

/** Plays the rest of a turn as the AI describes it. */
function playTurn(s: CanopyState, t: Turn): CanopyState {
  if (t.to >= 0) s = step(s, t.climber, t.to);
  if (s.winner) return s;
  if (t.grow >= 0) s = grow(s, t.grow);
  if (s.phase === 'cut') s = t.cut >= 0 ? cut(s, t.cut) : skipCut(s);
  return s;
}

describe('board', () => {
  test('25 tiles with consistent neighbours in 8 directions', () => {
    expect(CELL_COUNT).toBe(25);
    NB.forEach((row, i) => row.forEach((j, d) => { if (j >= 0) expect(NB[j][(d + 4) % 8]).toBe(i); }));
    expect(NB[cellAt(0, 0)].filter((n) => n >= 0).length).toBe(3);
    expect(NB[cellAt(2, 2)].filter((n) => n >= 0).length).toBe(8);
  });

  test('two climbers a side, mirrored, on bare moss', () => {
    const s = createGame();
    expect(s.climbers).toEqual([cellAt(1, 4), cellAt(3, 4), cellAt(3, 0), cellAt(1, 0)]);
    expect(s.climbers.map((c) => CELL_COUNT - 1 - c)).toEqual([s.climbers[2], s.climbers[3], s.climbers[0], s.climbers[1]]);
    expect(s.level.every((l) => l === 0)).toBe(true);
    expect(s.turn).toBe('X');
    expect(s.phase).toBe('move');
  });

  test('tile names count rows from the far side', () => {
    expect(cellName(cellAt(0, 0))).toBe('row 1, column 1');
    expect(cellName(cellAt(3, 4))).toBe('row 5, column 4');
  });
});

describe('stepping', () => {
  test('a climber steps onto any free tile around it', () => {
    const s = createGame();
    expect(stepTargets(s, 0).length).toBe(5); // on the edge
    const next = step(s, 0, cellAt(1, 3));
    expect(next.climbers[0]).toBe(cellAt(1, 3));
    expect(next.phase).toBe('grow');
    expect(next.active).toBe(0);
    expect(next.turn).toBe('X');
  });

  test('up at most one level, down any number', () => {
    const s = custom({ levels: [[1, 3, 2], [2, 3, 1]] });
    expect(stepTargets(s, 0)).not.toContain(cellAt(1, 3));
    expect(stepTargets(s, 0)).toContain(cellAt(2, 3));
    const high = custom({ levels: [[1, 4, 3]] });
    expect(stepTargets(high, 0)).toContain(cellAt(1, 3)); // three levels down
  });

  test('blossoms and other climbers block the way', () => {
    const s = custom({ levels: [[1, 3, BLOSSOM]], climbers: [[1, 4], [2, 4], [3, 0], [1, 0]] });
    const t = stepTargets(s, 0);
    expect(t).not.toContain(cellAt(1, 3));
    expect(t).not.toContain(cellAt(2, 4));
  });

  test('illegal steps leave the state untouched', () => {
    const s = createGame();
    expect(step(s, 2, cellAt(3, 1))).toBe(s); // not Violet's turn
    expect(step(s, 0, cellAt(1, 2))).toBe(s); // not adjacent
    const stepped = step(s, 0, cellAt(1, 3));
    expect(step(stepped, 1, cellAt(3, 3))).toBe(stepped); // must grow first
  });
});

describe('growing', () => {
  test('grows a free tile next to the climber that stepped', () => {
    const stepped = step(createGame(), 0, cellAt(1, 3));
    expect(growTargets(stepped, 0)).toContain(cellAt(1, 4)); // the tile it just left
    const next = grow(stepped, cellAt(1, 2));
    expect(next.level[cellAt(1, 2)]).toBe(1);
    expect(next.lastGrow).toBe(cellAt(1, 2));
    expect(grow(stepped, cellAt(4, 0))).toBe(stepped); // not next to the climber
  });

  test('with nothing to cut, the turn passes right after growing', () => {
    const next = grow(step(createGame(), 0, cellAt(1, 3)), cellAt(1, 2));
    expect(next.phase).toBe('move');
    expect(next.turn).toBe('O');
  });

  test('a treetop grows into a blossom, which cannot grow further', () => {
    const s = step(custom({ levels: [[2, 2, TREETOP], [0, 2, BLOSSOM]] }), 0, cellAt(1, 3));
    expect(growTargets(s, 0)).not.toContain(cellAt(0, 2));
    expect(grow(s, cellAt(2, 2)).level[cellAt(2, 2)]).toBe(BLOSSOM);
  });
});

describe('cutting', () => {
  test('after growing, a grown tile around the climber can be cut back one stage', () => {
    let s = step(custom({ levels: [[0, 2, 2], [2, 2, 1]] }), 0, cellAt(1, 3));
    s = grow(s, cellAt(1, 2));
    expect(s.phase).toBe('cut');
    expect(s.turn).toBe('X');
    expect(cutTargets(s, 0, s.lastGrow).sort()).toEqual([cellAt(0, 2), cellAt(2, 2)].sort());
    const next = cut(s, cellAt(0, 2));
    expect(next.level[cellAt(0, 2)]).toBe(1);
    expect(next.last).toEqual({ kind: 'cut', cell: cellAt(0, 2), level: 1 });
    expect(next.lastCut).toBe(cellAt(0, 2));
    expect(next.turn).toBe('O');
  });

  test('the tile grown this turn, bare moss and occupied tiles cannot be cut', () => {
    let s = step(custom({ levels: [[1, 2, 1], [2, 4, 2], [0, 2, 1]], climbers: [[1, 4], [2, 4], [3, 0], [1, 0]] }), 0, cellAt(1, 3));
    s = grow(s, cellAt(1, 2));
    expect(s.phase).toBe('cut');
    expect(cut(s, cellAt(1, 2))).toBe(s); // just grown
    expect(cut(s, cellAt(0, 3))).toBe(s); // moss
    expect(cut(s, cellAt(2, 4))).toBe(s); // a climber stands there
    expect(cutTargets(s, 0, s.lastGrow)).toEqual([cellAt(0, 2)]);
  });

  test('when only the grown tile could be cut, the turn passes at once', () => {
    const s = grow(step(custom({ levels: [[1, 2, 1]] }), 0, cellAt(1, 3)), cellAt(1, 2));
    expect(s.phase).toBe('move');
    expect(s.turn).toBe('O');
  });

  test('cutting is optional', () => {
    let s = grow(step(custom({ levels: [[0, 2, 2]] }), 0, cellAt(1, 3)), cellAt(1, 2));
    const next = skipCut(s);
    expect(next.level).toEqual(s.level);
    expect(next.turn).toBe('O');
    expect(next.last).toEqual({ kind: 'skip' });
    s = next;
    expect(skipCut(s)).toBe(s); // only in the cut phase
  });

  test("cutting a treetop puts its lantern out", () => {
    let s = custom({ levels: [[0, 2, TREETOP]], lanterns: [[0, 2, 'O']] });
    s = cut(grow(step(s, 0, cellAt(1, 3)), cellAt(1, 2)), cellAt(0, 2));
    expect(s.level[cellAt(0, 2)]).toBe(2);
    expect(s.lantern[cellAt(0, 2)]).toBeNull();
  });

  test('a blossom can be cut back to an unlit treetop', () => {
    let s = custom({ levels: [[0, 2, BLOSSOM]] });
    s = cut(grow(step(s, 0, cellAt(1, 3)), cellAt(1, 2)), cellAt(0, 2));
    expect(s.level[cellAt(0, 2)]).toBe(TREETOP);
    expect(s.lantern[cellAt(0, 2)]).toBeNull();
  });
});

describe('lanterns', () => {
  test('stepping onto a treetop lights a lantern that stays lit after leaving', () => {
    let s = custom({ levels: [[1, 4, 2], [1, 3, TREETOP]] });
    s = step(s, 0, cellAt(1, 3));
    expect(s.lantern[cellAt(1, 3)]).toBe('X');
    expect(s.last).toEqual({ kind: 'step', climber: 0, from: cellAt(1, 4), to: cellAt(1, 3), lit: true });
    s = grow(s, cellAt(0, 2));
    s = grow(step(s, 2, cellAt(3, 1)), cellAt(4, 2));
    s = step(s, 0, cellAt(1, 4)); // steps back down
    expect(s.lantern[cellAt(1, 3)]).toBe('X');
    expect(lanternCount(s, 'X')).toBe(1);
  });

  test("stepping onto the rival's lit treetop takes the lantern over", () => {
    const s = step(custom({ levels: [[1, 4, 2], [1, 3, TREETOP]], lanterns: [[1, 3, 'O']] }), 0, cellAt(1, 3));
    expect(s.lantern[cellAt(1, 3)]).toBe('X');
    expect(lanternCount(s, 'O')).toBe(0);
  });

  test('a blossom puts the lantern out', () => {
    let s = custom({ levels: [[2, 2, TREETOP]], lanterns: [[2, 2, 'O']] });
    s = grow(step(s, 0, cellAt(1, 3)), cellAt(2, 2));
    expect(s.level[cellAt(2, 2)]).toBe(BLOSSOM);
    expect(s.lantern[cellAt(2, 2)]).toBeNull();
  });

  test('two lanterns win at once, without growing', () => {
    const s = step(custom({ levels: [[1, 4, 2], [1, 3, TREETOP], [4, 4, TREETOP]], lanterns: [[4, 4, 'X']] }), 0, cellAt(1, 3));
    expect(s.winner).toBe('X');
    expect(s.reason).toBe('lanterns');
    expect(grow(s, cellAt(0, 2))).toBe(s);
    expect(step(s, 1, cellAt(3, 3))).toBe(s);
  });
});

describe('no move left', () => {
  test('a player whose climbers cannot step loses', () => {
    // Violet's climbers sit in the far corners, walled in by young trees but for one tile that Amber now closes.
    const levels: [number, number, number][] = [[1, 0, 2], [1, 1, 2], [3, 0, 2], [3, 1, 2], [4, 1, 2], [0, 1, 1]];
    const s = custom({ levels, climbers: [[0, 3], [2, 4], [0, 0], [4, 0]] });
    expect(hasMove(s, 'O')).toBe(true);
    const grown = grow(step(s, 0, cellAt(0, 2)), cellAt(0, 1));
    expect(grown.phase).toBe('cut'); // Amber could still cut the young tree at (1, 1)
    const next = skipCut(grown);
    expect(hasMove(next, 'O')).toBe(false);
    expect(next.winner).toBe('X');
    expect(next.reason).toBe('stuck');
  });

  test('a cut can free a walled-in climber', () => {
    const levels: [number, number, number][] = [[1, 0, 2], [1, 1, 2], [3, 0, 2], [3, 1, 2], [4, 1, 2], [0, 1, 2]];
    const s = custom({ levels, climbers: [[0, 3], [2, 4], [0, 0], [4, 0]] });
    expect(hasMove(s, 'O')).toBe(false);
    const next = cut(grow(step(s, 0, cellAt(0, 2)), cellAt(1, 3)), cellAt(0, 1));
    expect(next.winner).toBeNull();
    expect(hasMove(next, 'O')).toBe(true);
  });
});

describe('match', () => {
  test('select, step, grow, cut; the starter alternates', () => {
    let m = initialMatch();
    m = { ...m, game: custom({ levels: [[2, 2, 2]] }) };
    m = matchReducer(m, { type: 'select', climber: 2 }); // not Amber's
    expect(m.sel).toBe(-1);
    m = matchReducer(m, { type: 'select', climber: 1 });
    expect(m.sel).toBe(1);
    m = matchReducer(m, { type: 'select', climber: 1 }); // clicking again puts it down
    expect(m.sel).toBe(-1);
    m = matchReducer(m, { type: 'step', climber: 1, to: cellAt(3, 3), source: 'human' });
    expect(m.game.phase).toBe('grow');
    m = matchReducer(m, { type: 'select', climber: 0 }); // no re-selecting mid-turn
    expect(m.sel).toBe(-1);
    m = matchReducer(m, { type: 'grow', cell: cellAt(4, 2), source: 'human' });
    expect(m.game.phase).toBe('cut');
    m = matchReducer(m, { type: 'cut', cell: cellAt(2, 2), source: 'human' });
    expect(m.game.level[cellAt(2, 2)]).toBe(1);
    expect(m.game.turn).toBe('O');
    m = matchReducer(m, { type: 'newGame' });
    expect(m.game.turn).toBe('O');
    expect(m.gameId).toBe(1);
    m = matchReducer(m, { type: 'resetScores' });
    expect(m.game.turn).toBe('X');
  });

  test('wins are counted and the board locks', () => {
    let m = initialMatch();
    m = { ...m, game: custom({ levels: [[1, 4, 2], [1, 3, TREETOP], [4, 4, TREETOP]], lanterns: [[4, 4, 'X']] }) };
    m = matchReducer(m, { type: 'step', climber: 0, to: cellAt(1, 3), source: 'human' });
    expect(m.wins).toEqual({ X: 1, O: 0 });
    expect(matchReducer(m, { type: 'step', climber: 1, to: cellAt(3, 3), source: 'human' })).toBe(m);
  });

  test('against the computer, Violet only moves through the AI', () => {
    let m = matchReducer(initialMatch(), { type: 'setMode', mode: 'ai' });
    m = matchReducer(m, { type: 'step', climber: 0, to: cellAt(1, 3), source: 'human' });
    m = matchReducer(m, { type: 'grow', cell: cellAt(1, 2), source: 'human' });
    expect(isAiTurn(m)).toBe(true);
    expect(matchReducer(m, { type: 'step', climber: 2, to: cellAt(3, 1), source: 'human' })).toBe(m);
    expect(matchReducer(m, { type: 'select', climber: 2 })).toBe(m);
    const t = chooseTurn(m.game, 'easy', () => 0.9)!;
    m = matchReducer(m, { type: 'step', climber: t.climber, to: t.to, source: 'ai' });
    m = matchReducer(m, { type: 'grow', cell: t.grow, source: 'ai' });
    if (m.game.phase === 'cut') m = matchReducer(m, t.cut >= 0 ? { type: 'cut', cell: t.cut, source: 'ai' } : { type: 'skipCut', source: 'ai' });
    expect(m.game.turn).toBe('X');
  });
});

describe('computer player', () => {
  const levels: Difficulty[] = ['easy', 'medium', 'hard'];

  test('every level plays a legal whole turn from the start', () => {
    for (const d of levels) {
      const s = createGame('O'), next = playTurn(s, chooseTurn(s, d, () => 0.9)!);
      expect(next.turn).toBe('X');
      expect(next.level.reduce((a, b) => a + b, 0)).toBe(1);
    }
  });

  test('medium and hard light the winning lantern', () => {
    const s = custom({ levels: [[3, 0, 2], [3, 1, TREETOP], [0, 4, TREETOP]], lanterns: [[0, 4, 'O']], turn: 'O' });
    for (const d of ['medium', 'hard'] as const) {
      const t = chooseTurn(s, d, () => 0.5)!;
      expect(step(s, t.climber, t.to).winner).toBe('O');
      expect(t.grow).toBe(-1);
    }
  });

  test('hard stops a winning lantern', () => {
    // Amber holds one lantern and stands on a young tree next to a second treetop: Violet must deal with it.
    const s = custom({
      levels: [[1, 4, 2], [1, 3, TREETOP], [4, 4, TREETOP], [2, 2, 1]],
      lanterns: [[4, 4, 'X']],
      climbers: [[1, 4], [3, 4], [2, 2], [1, 0]],
      turn: 'O',
    });
    const next = playTurn(s, searchTurn(s, () => 0.5).turn!);
    expect(next.winner).toBeNull();
    const amberWins = [0, 1].some((c) => stepTargets(next, c).some((to) => step(next, c, to).winner === 'X'));
    expect(amberWins).toBe(false);
  });

  test('in the grow and cut phases it only chooses what is left', () => {
    const stepped = step(custom({ levels: [[4, 1, 2]], turn: 'O' }), 2, cellAt(3, 1));
    const growOptions = legalTurns(stepped);
    expect(growOptions.every((t) => t.to === -1 && t.climber === 2)).toBe(true);
    expect([...new Set(growOptions.map((t) => t.grow))].sort()).toEqual(growTargets(stepped, 2).sort());
    const cutting = grow(stepped, cellAt(2, 2));
    expect(cutting.phase).toBe('cut');
    const cutOptions = legalTurns(cutting);
    expect(cutOptions.every((t) => t.to === -1 && t.grow === -1)).toBe(true);
    expect(cutOptions.map((t) => t.cut).sort()).toEqual([-1, cellAt(4, 1)].sort());
    for (const d of levels) {
      const t = chooseTurn(cutting, d, () => 0.9)!;
      expect([-1, cellAt(4, 1)]).toContain(t.cut);
    }
  });

  test('hard stays within its node budget and plays legal turns for a long game', () => {
    let s = createGame(), turns = 0;
    const rand = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
    while (!s.winner && turns < 40) {
      const r = s.turn === 'X' ? searchTurn(s, rand, 20_000) : { turn: chooseTurn(s, 'medium', rand), nodes: 0 };
      expect(r.nodes).toBeLessThanOrEqual(HARD_NODES);
      const before = s.actionCount;
      s = playTurn(s, r.turn!);
      expect(s.actionCount).toBeGreaterThan(before);
      turns++;
    }
  });
});
