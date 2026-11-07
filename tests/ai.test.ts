import { beforeAll, describe, expect, test } from 'bun:test';
import { chooseMove, DIFFICULTY, minimax, negamax, Position, search } from '../src/lib/game/ai';
import { applyMove, createGame, legalMoves } from '../src/lib/game/rules';
import type { Difficulty, GameState } from '../src/lib/game/types';
import { solve, type Solution } from './solver';

const play = (moves: number[], starter: 'X' | 'O' = 'X'): GameState =>
  moves.reduce((s, m) => applyMove(s, m), createGame(starter));

/** Deterministic PRNG (mulberry32) so failures are reproducible. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const noRandom = () => 0.999;

let sol: Solution;
let sample: GameState[];
beforeAll(() => {
  sol = solve();
  sample = [...sol.states.values()].filter((_, i) => i % 40 === 0);
}, 60_000);

describe('solver sanity', () => {
  test('the first player wins with perfect play', () => {
    expect(sol.get(createGame('X')).label).toBe('WIN');
    expect(sol.get(createGame('O')).label).toBe('WIN');
  });
});

describe('R5.3 / R5.4 — tactics', () => {
  // O to move: O has 4, 5 (3 is empty) → O wins at 3.
  const winNow = play([0, 4, 8, 5, 1]); // X: 0,8,1 threatens 2 ; O: 4,5 threatens 3
  test.each(['easy', 'medium', 'hard'] as Difficulty[])('%s takes an immediate win', (d) => {
    expect(winNow.turn).toBe('O');
    expect(chooseMove(winNow, d, noRandom)).toBe(3);
  });

  // O to move, X threatens 0-1-2 at 2, O has no win.
  const mustBlock = play([0, 4, 1]);
  test.each(['medium', 'hard'] as Difficulty[])('%s blocks an immediate threat', (d) => {
    for (let i = 0; i < 20; i++) expect(chooseMove(mustBlock, d, Math.random)).toBe(2);
  });

  test('a “threat” using the mover’s vanishing piece is not a win', () => {
    // X: 0, 1, 7 (0 is oldest) ; O: 4, 5, 8. X to move. 2 would complete 0-1-2, but 0 vanishes first.
    const s = play([0, 4, 1, 5, 7, 8]);
    expect(s.turn).toBe('X');
    const pos = new Position(s);
    expect(pos.threats(0)).toEqual([]);
    expect(applyMove(s, 2).winner).toBeNull();
  });

  test('returns -1 when the game is over', () => {
    expect(chooseMove(play([0, 3, 1, 4, 2]), 'hard')).toBe(-1);
  });

  test('easy sometimes plays randomly, but always legally', () => {
    const r = rng(1);
    for (let i = 0; i < 200; i++) {
      const m = chooseMove(createGame('O'), 'easy', r);
      expect(legalMoves(createGame('O'))).toContain(m);
    }
  });
});

describe('R5.7 — alpha-beta equals plain minimax', () => {
  test('same root value at depths 1–6 (with and without transposition table)', () => {
    const r = rng(42);
    const positions = Array.from({ length: 60 }, () => sample[Math.floor(r() * sample.length)]);
    for (const s of positions) {
      for (let d = 1; d <= 6; d++) {
        const ref = minimax(new Position(s), d, 0);
        expect(negamax(new Position(s), d, -Infinity, Infinity, 0)).toBe(ref);
        expect(negamax(new Position(s), d, -Infinity, Infinity, 0, new Map())).toBe(ref);
      }
    }
  });

  test('pruning visits far fewer nodes than minimax', () => {
    const s = createGame('X');
    const mm = new Position(s), ab = new Position(s);
    minimax(mm, 7, 0);
    negamax(ab, 7, -Infinity, Infinity, 0);
    expect(ab.nodes * 5).toBeLessThan(mm.nodes);
  });

  test('root search reports every move sharing the best score', () => {
    for (const s of sample.slice(0, 300)) {
      const d = 4, r = search(s, d, false);
      const pos = new Position(s);
      for (const m of legalMoves(s)) {
        const removed = pos.make(m);
        const v = pos.winsAt(m, 1 - pos.side) ? 1000 : -negamax(pos, d - 1, -Infinity, Infinity, 1);
        pos.unmake(m, removed);
        expect(v <= r.score).toBe(true);
        expect(r.moves.includes(m)).toBe(v === r.score);
      }
    }
  });
});

describe('R5.5 — hard is optimal (checked against the exact solver)', () => {
  test('from WIN positions it keeps the win; from DRAW positions it never hands over a win', () => {
    let checked = 0;
    for (const s of sample) {
      const label = sol.get(s).label;
      if (label === 'LOSS') continue;
      for (const m of search(s, DIFFICULTY.hard.depth).moves) {
        const after = sol.after(s, m).label;
        if (label === 'WIN') expect(after).toBe('LOSS');
        else expect(after).not.toBe('WIN');
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(2000);
  }, 120_000);

  test('hard never loses to a random player and converts wins (100 games each side)', () => {
    const r = rng(7);
    for (const starter of ['X', 'O'] as const) {
      for (let g = 0; g < 100; g++) {
        let s = createGame(starter);
        while (!s.winner) {
          const moves = legalMoves(s);
          s = applyMove(s, s.turn === 'O' ? chooseMove(s, 'hard', r) : moves[Math.floor(r() * moves.length)]);
        }
        expect(s.winner).not.toBe('X');
      }
    }
  }, 120_000);

  test('hard vs hard: the starting player wins, as the solver predicts', () => {
    const r = rng(3);
    for (const starter of ['X', 'O'] as const) {
      let s = createGame(starter);
      while (!s.winner) s = applyMove(s, chooseMove(s, 'hard', r));
      expect(s.winner).toBe(starter);
    }
  }, 60_000);
});

describe('R5.6 — performance', () => {
  test('hard move on the empty board (worst case) stays under 100 ms', () => {
    search(createGame('O'), DIFFICULTY.hard.depth); // warm up the JIT
    const times = Array.from({ length: 5 }, () => {
      const t = performance.now();
      search(createGame('O'), DIFFICULTY.hard.depth);
      return performance.now() - t;
    }).sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(100);
  }, 30_000);
});
