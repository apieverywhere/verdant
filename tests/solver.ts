/**
 * Exact solver for vanishing tic-tac-toe via retrograde analysis.
 * Enumerates every reachable position (board + placement order + side to move) and labels it
 * WIN / LOSS / DRAW for the side to move, with the number of plies to the end for WIN/LOSS.
 * DRAW means neither side can force a win (play cycles forever).
 * Used only as a referee in tests.
 */
import { applyMove, createGame, positionKey } from '../src/lib/game/rules';
import type { GameState, Player } from '../src/lib/game/types';

export type Label = 'WIN' | 'LOSS' | 'DRAW';
export interface Solved {
  label: Label;
  /** Plies until the game ends under optimal play (winner fastest, loser slowest). */
  dist: number;
}

export const keyOf = (s: GameState) => positionKey(s.board, s.queues, s.turn);

/** Strips repetition history so the solver only reasons about board positions. */
function bare(s: GameState): GameState {
  return { ...s, history: {} };
}

export function solve() {
  const states = new Map<string, GameState>();
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const result = new Map<string, Solved>();

  const stack: GameState[] = [bare(createGame('X')), bare(createGame('O'))];
  for (const s of stack) states.set(keyOf(s), s);
  while (stack.length) {
    const s = stack.pop()!;
    const k = keyOf(s);
    const kids: string[] = [];
    for (let i = 0; i < 9; i++) {
      if (s.board[i]) continue;
      const n = applyMove(s, i);
      if (n.winner && n.winner !== 'D') {
        // Mover wins immediately: the state to move after it is a LOSS at distance 0.
        const tk = 'T' + keyOf(n);
        if (!result.has(tk)) result.set(tk, { label: 'LOSS', dist: 0 });
        kids.push(tk);
        (parents.get(tk) ?? parents.set(tk, []).get(tk)!).push(k);
        continue;
      }
      const nb = bare(n);
      const nk = keyOf(nb);
      kids.push(nk);
      (parents.get(nk) ?? parents.set(nk, []).get(nk)!).push(k);
      if (!states.has(nk)) {
        states.set(nk, nb);
        stack.push(nb);
      }
    }
    children.set(k, kids);
  }

  // Retrograde propagation (BFS by distance).
  const remaining = new Map<string, number>();
  for (const [k, kids] of children) remaining.set(k, kids.length);
  let frontier = [...result.keys()];
  while (frontier.length) {
    const next: string[] = [];
    for (const ck of frontier) {
      const c = result.get(ck)!;
      for (const pk of parents.get(ck) ?? []) {
        if (result.has(pk)) continue;
        if (c.label === 'LOSS') {
          result.set(pk, { label: 'WIN', dist: c.dist + 1 });
          next.push(pk);
        } else {
          const r = remaining.get(pk)! - 1;
          remaining.set(pk, r);
          if (r === 0) {
            const worst = Math.max(...children.get(pk)!.map((x) => result.get(x)!.dist));
            result.set(pk, { label: 'LOSS', dist: worst + 1 });
            next.push(pk);
          }
        }
      }
    }
    frontier = next;
  }
  for (const k of states.keys()) if (!result.has(k)) result.set(k, { label: 'DRAW', dist: Infinity });

  /** Label of the position reached after `cell` is played in `s` (from the new mover's view). */
  const after = (s: GameState, cell: number): Solved => {
    const n = applyMove(bare(s), cell);
    if (n.winner && n.winner !== 'D') return { label: 'LOSS', dist: 0 };
    return result.get(keyOf(bare(n)))!;
  };

  return { states, result, after, get: (s: GameState) => result.get(keyOf(s))! };
}

export type Solution = ReturnType<typeof solve>;

export function summary(sol: Solution, starter: Player = 'X') {
  return sol.get(createGame(starter));
}
