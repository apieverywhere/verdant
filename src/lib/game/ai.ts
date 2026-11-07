/**
 * Computer opponent: negamax (minimax for zero-sum games) with alpha-beta pruning,
 * a depth limit and a heuristic evaluation aware of the vanishing rule.
 * See docs/specs/vanishing-tic-tac-toe/design.md §3.
 */
import { LINES, MAX_PIECES } from './rules';
import type { Difficulty, GameState, Player } from './types';

export const WIN = 1000;
const INF = 1_000_000;

export interface DifficultyConfig {
  depth: number;
  /** Probability of playing a random legal move instead of searching. */
  randomness: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { depth: 1, randomness: 0.35 },
  medium: { depth: 3, randomness: 0 },
  hard: { depth: 18, randomness: 0 },
};

/** Lines passing through each cell, precomputed for fast win checks. */
const LINES_AT: number[][][] = Array.from({ length: 9 }, (_, c) =>
  LINES.filter((l) => l.includes(c)).map((l) => [...l]),
);
const ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];

/** Mutable search position: side 0 = X, 1 = O; board holds 0 (empty), 1 (X), 2 (O). */
export class Position {
  board = new Int8Array(9);
  queues: [number[], number[]] = [[], []];
  side: 0 | 1;
  nodes = 0;

  constructor(state: GameState) {
    state.board.forEach((c, i) => (this.board[i] = c === 'X' ? 1 : c === 'O' ? 2 : 0));
    this.queues = [state.queues.X.slice(), state.queues.O.slice()];
    this.side = state.turn === 'X' ? 0 : 1;
  }

  /** Unique integer for (placement order of both sides, side to move); the board follows from it. */
  key(): number {
    let k = this.side;
    for (const q of this.queues) {
      let e = 0;
      for (const c of q) e = e * 10 + c + 1;
      k = k * 1000 + e;
    }
    return k;
  }

  /** Plays `cell`; returns the removed cell (or -1) for unmake. */
  make(cell: number): number {
    const q = this.queues[this.side];
    this.board[cell] = this.side + 1;
    q.push(cell);
    let removed = -1;
    if (q.length > MAX_PIECES) {
      removed = q.shift()!;
      this.board[removed] = 0;
    }
    this.side = (1 - this.side) as 0 | 1;
    return removed;
  }

  unmake(cell: number, removed: number) {
    this.side = (1 - this.side) as 0 | 1;
    const q = this.queues[this.side];
    q.pop();
    this.board[cell] = 0;
    if (removed >= 0) {
      q.unshift(removed);
      this.board[removed] = this.side + 1;
    }
  }

  /** Whether `side` has three in a row through `cell`. */
  winsAt(cell: number, side: number): boolean {
    const v = side + 1, b = this.board;
    for (const l of LINES_AT[cell]) if (b[l[0]] === v && b[l[1]] === v && b[l[2]] === v) return true;
    return false;
  }

  /**
   * Cells where `side` would complete a line on its next move, taking into account that
   * its oldest piece vanishes first when it already has MAX_PIECES on the board.
   */
  threats(side: number): number[] {
    const q = this.queues[side], b = this.board, v = side + 1;
    const leaving = q.length === MAX_PIECES ? q[0] : -1;
    const out: number[] = [];
    for (const l of LINES) {
      let own = 0, empty = -1, blocked = false;
      for (const c of l) {
        if (b[c] === v && c !== leaving) own++;
        else if (b[c] === 0) empty = c;
        else { blocked = true; break; }
      }
      if (!blocked && own === 2 && empty >= 0 && !out.includes(empty)) out.push(empty);
    }
    return out;
  }

  /** Heuristic score from the perspective of the side to move. */
  evaluate(): number {
    const me = this.side, opp = 1 - me;
    if (this.threats(me).length) return WIN / 2;
    return this.sideScore(me) - this.sideScore(opp);
  }

  private sideScore(side: number): number {
    const q = this.queues[side], b = this.board, v = side + 1;
    const leaving = q.length === MAX_PIECES ? q[0] : -1;
    let s = b[4] === v && leaving !== 4 ? 3 : 0;
    for (const l of LINES) {
      let own = 0, foe = false;
      for (const c of l) {
        if (b[c] === v) { if (c !== leaving) own++; }
        else if (b[c] !== 0) { foe = true; break; }
      }
      if (!foe) s += own === 2 ? 10 : own === 1 ? 1 : 0;
    }
    return s;
  }

  /** Legal moves ordered to maximise cut-offs: wins, blocks, then centre/corners/edges. */
  orderedMoves(): number[] {
    const wins = this.threats(this.side), blocks = this.threats(1 - this.side);
    const moves: number[] = [];
    for (const c of wins) moves.push(c);
    for (const c of blocks) if (!moves.includes(c)) moves.push(c);
    for (const c of ORDER) if (this.board[c] === 0 && !moves.includes(c)) moves.push(c);
    return moves;
  }
}

const enum Bound { Exact, Lower, Upper }
interface TTEntry { depth: number; value: number; bound: Bound }
/** Transposition table: positions recur constantly in this variant because pieces vanish. */
export type TTable = Map<number, TTEntry>;

/** Mate scores are stored relative to the node so they stay valid at any ply. */
const MATE = WIN - 100;
const toTT = (v: number, ply: number) => (v > MATE ? v + ply : v < -MATE ? v - ply : v);
const fromTT = (v: number, ply: number) => (v > MATE ? v - ply : v < -MATE ? v + ply : v);

/** Negamax with alpha-beta pruning. Scores are from the side to move's perspective. */
export function negamax(pos: Position, depth: number, alpha: number, beta: number, ply: number, tt?: TTable): number {
  pos.nodes++;
  if (depth === 0) return pos.evaluate();
  const alpha0 = alpha;
  const key = tt ? pos.key() : 0;
  const hit = tt?.get(key);
  if (hit && hit.depth >= depth) {
    const v = fromTT(hit.value, ply);
    if (hit.bound === Bound.Exact) return v;
    if (hit.bound === Bound.Lower && v > alpha) alpha = v;
    else if (hit.bound === Bound.Upper && v < beta) beta = v;
    if (alpha >= beta) return v;
  }
  let best = -INF;
  for (const m of pos.orderedMoves()) {
    const mover = pos.side;
    const removed = pos.make(m);
    const score = pos.winsAt(m, mover) ? WIN - ply : -negamax(pos, depth - 1, -beta, -alpha, ply + 1, tt);
    pos.unmake(m, removed);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break; // cut-off: the opponent will never allow this line
  }
  if (tt) {
    const bound = best <= alpha0 ? Bound.Upper : best >= beta ? Bound.Lower : Bound.Exact;
    tt.set(key, { depth, value: toTT(best, ply), bound });
  }
  return best;
}

/** Plain minimax without pruning; reference implementation for tests and benchmarks. */
export function minimax(pos: Position, depth: number, ply: number): number {
  pos.nodes++;
  if (depth === 0) return pos.evaluate();
  let best = -INF;
  for (let m = 0; m < 9; m++) {
    if (pos.board[m] !== 0) continue;
    const mover = pos.side;
    const removed = pos.make(m);
    const score = pos.winsAt(m, mover) ? WIN - ply : -minimax(pos, depth - 1, ply + 1);
    pos.unmake(m, removed);
    if (score > best) best = score;
  }
  return best;
}

export interface SearchResult {
  /** Every root move sharing the best score. */
  moves: number[];
  score: number;
  nodes: number;
}

/** Scores each root move; moves equal to the best are searched with an exact window. */
export function search(state: GameState, depth: number, useTT = true): SearchResult {
  const pos = new Position(state);
  const tt: TTable | undefined = useTT ? new Map() : undefined;
  let best = -INF, moves: number[] = [];
  for (const m of pos.orderedMoves()) {
    const mover = pos.side;
    const removed = pos.make(m);
    const score = pos.winsAt(m, mover) ? WIN : -negamax(pos, depth - 1, -INF, -(best - 1), 1, tt);
    pos.unmake(m, removed);
    if (score > best) { best = score; moves = [m]; }
    else if (score === best) moves.push(m);
  }
  return { moves, score: best, nodes: pos.nodes };
}

export function chooseMove(state: GameState, difficulty: Difficulty, random: () => number = Math.random): number {
  const empty: number[] = [];
  state.board.forEach((c, i) => { if (!c) empty.push(i); });
  if (!empty.length || state.winner) return -1;
  const cfg = DIFFICULTY[difficulty];
  if (cfg.randomness > 0 && random() < cfg.randomness) return empty[Math.floor(random() * empty.length)];
  const { moves } = search(state, cfg.depth);
  return moves[Math.floor(random() * moves.length)];
}

export const aiPlayer: Player = 'O';
