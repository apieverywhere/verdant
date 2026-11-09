/**
 * Tidepool computer player (Coral) at three levels:
 * - Easy: one ply, often a random move.
 * - Medium: the design's 2-ply player — for each move it assumes the reply that hurts it most.
 * - Hard: alpha-beta search with quiescence over push-offs (`search.ts`).
 */
import type { Cell, Difficulty, Player } from '../game/types';
import { allMoves, applyBoard, CELL_COUNT, CELLS, NB, other, WIN_PUSHES, type Move, type TidepoolState } from './rules';
import { searchMove } from './search';

export const aiPlayer: Player = 'O';

const EASY_RANDOM_CHANCE = 0.35;

/** The design's evaluation: marbles in the sea, distance from the edge and how tightly marbles cluster. */
export function evaluate(b: readonly Cell[], lost: Record<Player, number>, me: Player): number {
  const opp = other(me);
  let s = (lost[opp] - lost[me]) * 1000;
  for (let i = 0; i < CELL_COUNT; i++) {
    const p = b[i];
    if (!p) continue;
    const ring = CELLS[i].ring;
    let friends = 0;
    for (let d = 0; d < 6; d++) {
      const j = NB[i][d];
      if (j >= 0 && b[j] === p) friends++;
    }
    s += (p === me ? 1 : -1) * (-ring * 4 + friends * 1.2 - (ring === 4 ? 3 : 0));
  }
  return s;
}

/** Medium: the design's 2-ply player. `noise` returns values in [0, 1). */
export function designMove(state: TidepoolState, noise: () => number = Math.random): Move | null {
  if (state.winner) return null;
  const me = state.turn, opp = other(me);
  const moves = allMoves(state.board, me).sort((a, b) => b.push - a.push);
  let best: Move | null = null, bestV = -Infinity;
  for (const mv of moves) {
    const r1 = applyBoard(state.board, state.lost, mv, me);
    if (r1.lost[opp] >= WIN_PUSHES) return mv;
    // Noise is drawn up front: adding it after a cut-off could lift a refuted move above the best one.
    const jitter = noise() * 2;
    const replies = allMoves(r1.board, opp);
    let worst = (replies.length ? Infinity : evaluate(r1.board, r1.lost, me)) + jitter;
    for (const rep of replies) {
      const r2 = applyBoard(r1.board, r1.lost, rep, opp);
      worst = Math.min(worst, evaluate(r2.board, r2.lost, me) + jitter);
      if (worst <= bestV) break; // cannot beat the best move found so far
    }
    if (worst > bestV) {
      bestV = worst;
      best = mv;
    }
  }
  return best;
}

/** Easy: best move one ply deep, or a random one a third of the time. */
function easyMove(state: TidepoolState, random: () => number): Move | null {
  const me = state.turn, moves = allMoves(state.board, me);
  if (!moves.length || state.winner) return null;
  if (random() < EASY_RANDOM_CHANCE) return moves[Math.floor(random() * moves.length)];
  let best = moves[0], bestV = -Infinity;
  for (const mv of moves) {
    const r = applyBoard(state.board, state.lost, mv, me);
    const v = evaluate(r.board, r.lost, me) + random() * 6;
    if (v > bestV) {
      bestV = v;
      best = mv;
    }
  }
  return best;
}

/** Move for the side to move at the given level, or null when there is none. */
export function chooseMove(state: TidepoolState, difficulty: Difficulty = 'hard', random: () => number = Math.random): Move | null {
  if (difficulty === 'hard') return searchMove(state, random).move;
  if (difficulty === 'medium') return designMove(state, random);
  return easyMove(state, random);
}
