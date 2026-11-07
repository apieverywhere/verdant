/**
 * Hard Ember & Tide player: negamax with alpha-beta and iterative deepening, bounded by a node budget so the
 * strength does not depend on the speed of the machine. Line counts are kept incrementally, so placing a piece
 * touches only the lines through its cell rather than all 302.
 */
import type { Player } from '../game/types';
import { CELL_LINES, CELLS, COLUMNS, LINES, SIZE, WIN_LENGTH, type FireWaterState } from './rules';

const WIN = 1_000_000;
/** Scores this close to WIN mean a forced result: searching deeper cannot change the decision. */
const FORCED = WIN - 1_000;
const MAX_DEPTH = 16;
const MAX_NODES = 30_000;
/**
 * Value of a line by the number of pieces on it, when the opponent has none there. Twos are weighted heavily
 * on purpose: killing them early is what prevents double threats beyond the horizon. Tuned by self-play;
 * with 0, 1, 8, 50 the search only broke even against the Medium scorer.
 */
const LINE_VALUE = [0, 1, 20, 120];

type Side = 0 | 1;

/** Columns nearest the centre first: they lie on the most lines, so they tend to cut off early. */
const CENTRE_FIRST = Array.from({ length: COLUMNS }, (_, c) => c).sort((a, b) => dist(a) - dist(b));
function dist(col: number) {
  return Math.abs(col % SIZE - 2) + Math.abs(Math.floor(col / SIZE) - 2);
}

class Search {
  private counts = [new Int8Array(LINES.length), new Int8Array(LINES.length)];
  private heights = new Int8Array(COLUMNS);
  /** Line score from side 0's point of view. */
  private score = 0;
  private history = new Int32Array(COLUMNS);
  private nodes = 0;
  private aborted = false;

  constructor(state: FireWaterState, me: Player) {
    for (let i = 0; i < CELLS; i++) {
      const p = state.board[i];
      if (!p) continue;
      this.place(i % COLUMNS, p === me ? 0 : 1);
    }
  }

  private place(col: number, side: Side) {
    const cell = col + COLUMNS * this.heights[col]++;
    const mine = this.counts[side], theirs = this.counts[1 - side], sign = side === 0 ? 1 : -1;
    for (const id of CELL_LINES[cell]) {
      const a = mine[id], b = theirs[id];
      if (b === 0) this.score += sign * (LINE_VALUE[a + 1 === WIN_LENGTH ? a : a + 1] - LINE_VALUE[a]);
      else if (a === 0) this.score += sign * LINE_VALUE[b]; // this piece kills the opponent's line
      mine[id] = a + 1;
    }
  }

  private unplace(col: number, side: Side) {
    const cell = col + COLUMNS * --this.heights[col], mine = this.counts[side];
    for (const id of CELL_LINES[cell]) mine[id]--;
  }

  /** Whether `side` completes a line by playing the next free cell of `col`. */
  private completes(col: number, side: Side) {
    const cell = col + COLUMNS * this.heights[col], mine = this.counts[side];
    for (const id of CELL_LINES[cell]) if (mine[id] === WIN_LENGTH - 1) return true;
    return false;
  }

  /** Playable columns best-first; a single entry when the move is forced by an opposing threat. */
  private moves(side: Side): number[] | 'win' {
    const legal: number[] = [];
    let forced = -1;
    for (const col of CENTRE_FIRST) {
      if (this.heights[col] >= SIZE) continue;
      if (this.completes(col, side)) return 'win';
      if (forced < 0 && this.completes(col, (1 - side) as Side)) forced = col;
      legal.push(col);
    }
    if (forced >= 0) return [forced];
    const h = this.history;
    return legal.sort((a, b) => h[b] - h[a]);
  }

  private negamax(depth: number, alpha: number, beta: number, side: Side, ply: number): number {
    if (++this.nodes > MAX_NODES) {
      this.aborted = true;
      return 0;
    }
    const moves = this.moves(side);
    if (moves === 'win') return WIN - ply;
    if (moves.length === 0) return 0; // full board
    if (depth <= 0) return side === 0 ? this.score : -this.score;

    const next = (1 - side) as Side;
    let best = -Infinity;
    for (const col of moves) {
      const saved = this.score;
      this.place(col, side);
      const v = -this.negamax(depth - 1, -beta, -alpha, next, ply + 1);
      this.unplace(col, side);
      this.score = saved;
      if (this.aborted) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        this.history[col] += depth * depth;
        break;
      }
    }
    return best;
  }

  /** Best column for side 0, deepening until the node budget runs out or the result is forced. */
  bestColumn(random: () => number): number {
    const moves = this.moves(0);
    if (moves === 'win') return CENTRE_FIRST.find((c) => this.heights[c] < SIZE && this.completes(c, 0))!;
    if (moves.length <= 1) return moves[0] ?? -1;

    // Shuffling first lets equally good moves differ from game to game.
    const order = moves.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    let chosen = order[0];
    for (let depth = 1; depth <= MAX_DEPTH; depth++) {
      let alpha = -Infinity, best = -1;
      for (const col of order) {
        const saved = this.score;
        this.place(col, 0);
        const v = -this.negamax(depth - 1, -Infinity, -alpha, 1, 1);
        this.unplace(col, 0);
        this.score = saved;
        if (this.aborted) return chosen; // an unfinished depth is not comparable, keep the last complete one
        if (v > alpha) {
          alpha = v;
          best = col;
        }
      }
      chosen = best;
      order.splice(order.indexOf(best), 1);
      order.unshift(best);
      if (Math.abs(alpha) >= FORCED) break;
    }
    return chosen;
  }
}

export function searchColumn(state: FireWaterState, random: () => number): number {
  return new Search(state, state.turn).bestColumn(random);
}
