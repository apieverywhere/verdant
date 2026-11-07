import { describe, expect, test } from 'bun:test';
import { chooseColumn } from '../src/lib/fire-water/ai';
import { initialMatch, isAiTurn, matchReducer, type FireWaterAction, type FireWaterMatch } from '../src/lib/fire-water/match';
import type { Difficulty } from '../src/lib/game/types';
import { applyMove, CELL_LINES, CELLS, COLUMNS, createGame, dropCell, LINES, stackHeight, type FireWaterState } from '../src/lib/fire-water/rules';

const moves = (cols: number[], s = createGame()) => cols.reduce(applyMove, s);
const col = (x: number, z: number) => x + 5 * z;
const noNoise = () => 0;
const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

describe('F1 — rules', () => {
  test('pieces drop to the lowest free cell and stack upwards', () => {
    const s = moves([7, 7, 7]);
    expect(s.board[7]).toBe('X');
    expect(s.board[7 + 25]).toBe('O');
    expect(s.board[7 + 50]).toBe('X');
    expect(stackHeight(s.board, 7)).toBe(3);
    expect(dropCell(s.board, 7)).toBe(7 + 75);
  });

  test('a full column rejects the move without changing the state', () => {
    const s = moves([3, 3, 3, 3, 3]);
    expect(dropCell(s.board, 3)).toBe(-1);
    expect(stackHeight(s.board, 3)).toBe(5);
    expect(applyMove(s, 3)).toBe(s);
  });

  test('out-of-range columns are rejected', () => {
    const s = createGame();
    for (const c of [-1, 25, 1.5, NaN]) expect(applyMove(s, c)).toBe(s);
  });

  test('there are 302 lines of 4 and each cell index is consistent', () => {
    expect(LINES.length).toBe(302);
    expect(new Set(LINES.map((l) => [...l].sort((a, b) => a - b).join())).size).toBe(302);
    LINES.forEach((l, id) => l.forEach((c) => expect(CELL_LINES[c]).toContain(id)));
  });

  test('wins along a row on the floor', () => {
    const s = moves([0, 5, 1, 6, 2, 7, 3]);
    expect(s.winner).toBe('X');
    expect(s.line).toEqual([0, 1, 2, 3]);
  });

  test('wins along a vertical stack', () => {
    expect(moves([0, 1, 0, 1, 0, 1, 0]).line).toEqual([0, 25, 50, 75]);
  });

  test('wins along a rising diagonal', () => {
    // X at height k on column k: steps (x+1, y+1).
    const s = moves([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    expect(s.winner).toBe('X');
    expect(s.line).toEqual([0, 26, 52, 78]);
  });

  test('wins along a space diagonal', () => {
    // X needs (0,0,0) (1,1,1) (2,2,2) (3,3,3); O's replies fill the supports below.
    const a = col(1, 1), b = col(2, 2), c = col(3, 3);
    const s = moves([col(0, 0), a, a, b, 4, b, b, c, 9, c, 14, c, c]);
    expect(s.winner).toBe('X');
    expect(s.line).toEqual([0, 31, 62, 93]);
  });

  test('moves after a win are rejected', () => {
    const s = moves([0, 5, 1, 6, 2, 7, 3]);
    expect(applyMove(s, 10)).toBe(s);
  });

  test('a full board without a line is a draw', () => {
    // One free cell left, and no line through it can be completed by O.
    const board: FireWaterState['board'] = Array.from({ length: CELLS }, (_, i) => (i % 2 ? 'O' : 'X'));
    board[124] = null;
    const s: FireWaterState = { ...createGame(), board, turn: 'O', moveCount: CELLS - 1 };
    expect(applyMove(s, 24).winner).toBe('D');
  });
});

const human = (...cols: number[]): FireWaterAction[] => cols.map((c) => ({ type: 'play', col: c, source: 'human' }));
const run = (m: FireWaterMatch, actions: FireWaterAction[]) => actions.reduce(matchReducer, m);

describe('F2 — match flow', () => {
  test('a win updates the score of the winner', () => {
    expect(run(initialMatch(), human(0, 5, 1, 6, 2, 7, 3)).scores).toEqual({ X: 1, O: 0, D: 0 });
  });

  test('new game keeps scores, lets the loser start and issues a new board id', () => {
    const won = run(initialMatch(), human(0, 5, 1, 6, 2, 7, 3));
    const next = matchReducer(won, { type: 'newGame' });
    expect(next.game.turn).toBe('O');
    expect(next.scores.X).toBe(1);
    expect(next.gameId).toBe(won.gameId + 1);
  });

  test('new game: Fire starts after losing a round Fire also started', () => {
    const waterWins = run(initialMatch(), human(0, 5, 1, 6, 2, 7, 20, 8));
    expect(waterWins.game.winner).toBe('O');
    expect(matchReducer(waterWins, { type: 'newGame' }).game.turn).toBe('X');
  });

  test('new game after an unfinished round alternates the starter', () => {
    expect(matchReducer(run(initialMatch(), human(12)), { type: 'newGame' }).game.turn).toBe('O');
  });

  test('reset scores clears them and gives Fire the first move', () => {
    const m = run(initialMatch(), [...human(0, 5, 1, 6, 2, 7, 3), { type: 'newGame' }, { type: 'resetScores' }]);
    expect(m.scores).toEqual({ X: 0, O: 0, D: 0 });
    expect(m.game.turn).toBe('X');
  });

  test('switching mode clears scores; re-selecting the same mode does nothing', () => {
    const m = run(initialMatch(), human(0, 5, 1, 6, 2, 7, 3));
    const ai = matchReducer(m, { type: 'setMode', mode: 'ai' });
    expect(ai.scores.X).toBe(0);
    expect(matchReducer(ai, { type: 'setMode', mode: 'ai' })).toBe(ai);
  });

  test('hard is the default; changing difficulty starts over and clears scores', () => {
    const m = run(initialMatch('ai'), human(12));
    expect(m.difficulty).toBe('hard');
    const easy = matchReducer({ ...m, scores: { X: 2, O: 1, D: 0 } }, { type: 'setDifficulty', difficulty: 'easy' });
    expect(easy.difficulty).toBe('easy');
    expect(easy.game.moveCount).toBe(0);
    expect(easy.scores).toEqual({ X: 0, O: 0, D: 0 });
    expect(matchReducer(easy, { type: 'setDifficulty', difficulty: 'easy' })).toBe(easy);
  });

  test('a human cannot move for the computer, and the computer only moves on its turn', () => {
    const m = run(initialMatch('ai'), human(12));
    expect(isAiTurn(m)).toBe(true);
    expect(matchReducer(m, { type: 'play', col: 0, source: 'human' })).toBe(m);
    const after = matchReducer(m, { type: 'play', col: 0, source: 'ai' });
    expect(after).not.toBe(m);
    expect(matchReducer(after, { type: 'play', col: 1, source: 'ai' })).toBe(after);
  });
});

describe('F3.3 — medium computer player', () => {
  test('takes an immediate win over a block', () => {
    // X threatens column 3, O threatens column 8; O is to move.
    const s = moves([0, 5, 1, 6, 2, 7, 24]);
    expect(s.turn).toBe('O');
    expect(chooseColumn(s, 'medium', noNoise)).toBe(8);
  });

  test('blocks the opponent’s immediate win', () => {
    const s = moves([0, 24, 1, 23, 2]);
    expect(s.turn).toBe('O');
    expect(chooseColumn(s, 'medium', noNoise)).toBe(3);
  });

  test('blocks a vertical threat', () => {
    const s = moves([12, 0, 12, 24, 12]);
    expect(chooseColumn(s, 'medium', noNoise)).toBe(12);
  });

  test('does not play under a cell that lets the opponent win', () => {
    // X holds cells 25-27 at height 1, so a piece in column 3 would let X complete the line one level up.
    const board: FireWaterState['board'] = Array(CELLS).fill(null);
    for (const i of [0, 25, 26, 27]) board[i] = 'X';
    for (const i of [1, 2]) board[i] = 'O';
    const s: FireWaterState = { ...createGame(), board, turn: 'O', moveCount: 6 };
    expect(chooseColumn(s, 'medium', noNoise)).not.toBe(3);
  });

  test('skips full columns and returns −1 on a finished board', () => {
    let s = createGame();
    for (let i = 0; i < 5; i++) s = applyMove(s, 12);
    for (let i = 0; i < 20; i++) expect(chooseColumn(s, 'medium')).not.toBe(12);
    const full: FireWaterState = { ...createGame(), board: Array(CELLS).fill('X') };
    for (const d of LEVELS) expect(chooseColumn(full, d)).toBe(-1);
  });

  test('self-play always finishes with a legal result', () => {
    for (let g = 0; g < 30; g++) {
      let s = createGame(g % 2 ? 'X' : 'O');
      while (!s.winner) {
        const c = chooseColumn(s, 'medium');
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(COLUMNS);
        const next = applyMove(s, c);
        expect(next).not.toBe(s);
        s = next;
      }
      expect(s.moveCount).toBeLessThanOrEqual(CELLS);
    }
  });
});

/** Plays a series with `a` as X and `b` as O, alternating the starter; returns the wins of `a`. */
function series(a: Difficulty, b: Difficulty, games: number) {
  let wins = 0;
  for (let g = 0; g < games; g++) {
    let s = createGame(g % 2 ? 'X' : 'O');
    while (!s.winner) s = applyMove(s, chooseColumn(s, s.turn === 'X' ? a : b));
    if (s.winner === 'X') wins++;
  }
  return wins;
}

describe('F3.2 — easy computer player', () => {
  test('the random branch picks any legal column', () => {
    const rolls = [0.1, 0.5]; // below the random chance, then the index into 25 columns
    expect(chooseColumn(createGame(), 'easy', () => rolls.shift()!)).toBe(12);
  });

  test('does not look at the cell above', () => {
    const board: FireWaterState['board'] = Array(CELLS).fill(null);
    for (const i of [0, 25, 26, 27]) board[i] = 'X';
    for (const i of [1, 2]) board[i] = 'O';
    const s: FireWaterState = { ...createGame(), board, turn: 'O', moveCount: 6 };
    expect(chooseColumn(s, 'easy', () => 0.5)).toBe(3); // the line score alone favours the gift
  });
});

describe('F3.4 — hard computer player', () => {
  test('takes an immediate win over a block', () => {
    expect(chooseColumn(moves([0, 5, 1, 6, 2, 7, 24]), 'hard', noNoise)).toBe(8);
  });

  test('blocks the opponent’s immediate win', () => {
    expect(chooseColumn(moves([0, 24, 1, 23, 2]), 'hard', noNoise)).toBe(3);
  });

  test('sets up a double threat when one exists', () => {
    // O holds the middle of an open row: one more piece threatens both ends at once.
    const s = moves([0, 11, 4, 12]);
    const after = applyMove(s, 24); // X elsewhere; O to move
    const played = applyMove(after, chooseColumn(after, 'hard', noNoise));
    const threats = Array.from({ length: COLUMNS }, (_, c) => c).filter((c) => {
      const cell = dropCell(played.board, c);
      return cell >= 0 && CELL_LINES[cell].some((id) => LINES[id].every((q) => q === cell || played.board[q] === 'O'));
    });
    expect(threats.length).toBeGreaterThanOrEqual(2);
  });

  test('does not play under a cell that lets the opponent win', () => {
    const board: FireWaterState['board'] = Array(CELLS).fill(null);
    for (const i of [0, 25, 26, 27]) board[i] = 'X';
    for (const i of [1, 2]) board[i] = 'O';
    const s: FireWaterState = { ...createGame(), board, turn: 'O', moveCount: 6 };
    expect(chooseColumn(s, 'hard', noNoise)).not.toBe(3);
  });

  test('does not answer a centre opening by stacking on it', () => {
    // Stacking on the centre lost by force three moves later (centre, stack, X at 16, O at 8, X at 17: X wins).
    for (const roll of [0, 0.5, 0.99]) expect(chooseColumn(moves([12]), 'hard', () => roll)).not.toBe(12);
  });
});

describe('F3 — strength order', () => {
  test('medium clearly beats easy', () => {
    expect(series('medium', 'easy', 60)).toBeGreaterThanOrEqual(45);
  }, 30_000);

  test('hard clearly beats medium', () => {
    expect(series('hard', 'medium', 20)).toBeGreaterThanOrEqual(15);
  }, 300_000); // ~2 min: Hard searches 300k nodes per move
});
