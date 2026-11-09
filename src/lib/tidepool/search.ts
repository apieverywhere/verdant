/**
 * Hard Tidepool player: negamax with alpha-beta, iterative deepening, a transposition table and a quiescence
 * search over push-offs, bounded by a node budget so the strength does not depend on the machine's speed.
 * Boards are Int8Arrays (0 empty, 1 / 2 a side) and moves are packed into one integer, so the search allocates
 * little beyond one board copy per node.
 */
import type { Player } from '../game/types';
import { CELL_COUNT, CELLS, NB, WIN_PUSHES, type Move, type TidepoolState } from './rules';

const N = CELL_COUNT;
const NBF = new Int16Array(N * 6);
NB.forEach((row, i) => row.forEach((j, d) => (NBF[i * 6 + d] = j)));
const RING = Int8Array.from(CELLS, (c) => c.ring);

// ---------------------------------------------------------------- tuning
const WIN = 1_000_000;
const FORCED = WIN - 1_000;
/** Evaluation weights, tuned by self-play (`scripts/bench-tidepool.ts`). */
export const TUNE = {
  /** One marble in the sea outweighs any positional difference. */
  material: 1_000,
  /** Value of a marble by its distance from the centre (ring 0 … 4): the edge is where marbles are lost. */
  centre: [40, 30, 18, 6, -14],
  /** Each friendly neighbour: compact groups cannot be pushed and push others. */
  cohesion: 4,
  /** One of our rim marbles the opponent can push off right now. */
  exposed: 160,
  /** Each opponent rim marble we could push off now (we move next, so this is a real threat). */
  attack: 200,
  /** Extra weight on the centre term once ahead in marbles: squeeze the opponent instead of waiting. */
  pressAhead: 10,
  /** Root penalty per earlier occurrence of the position a move leads to: stops going round in circles. */
  repeat: 400,
};
const MAX_DEPTH = 12;
const QDEPTH = 4;
/**
 * Reaches 4–6 plies, ~0.7 s per move on average (up to ~1.6 s) on a laptop; the game runs it in a worker, so
 * the scene keeps moving. Self-play: 400k beat 120k 9–1 over 10 games and Medium 8–0 (2 unfinished).
 */
export const HARD_NODES = 400_000;

// ---------------------------------------------------------------- moves
// packed move: c0 | c1<<6 | c2<<12 | len<<18 | dir<<20 | push<<23 | off<<25 | leadIdx<<26 (3 = sideways)
const mC = (m: number, k: number) => (m >> (6 * k)) & 63;
const mLen = (m: number) => (m >> 18) & 3;
const mDir = (m: number) => (m >> 20) & 7;
const mPush = (m: number) => (m >> 23) & 3;
const mOff = (m: number) => (m >> 25) & 1;
const mLead = (m: number) => (m >> 26) & 3;

function addGroup(b: Int8Array, me: number, g0: number, g1: number, g2: number, len: number, ad: number, out: number[]) {
  const opp = 3 - me, base = g0 | (g1 << 6) | (g2 << 12) | (len << 18);
  for (let d = 0; d < 6; d++) {
    if (len === 1 || d === ad || d === (ad + 3) % 6) {
      const li = len === 1 || d !== ad ? 0 : len - 1, lead = li === 0 ? g0 : li === 1 ? g1 : g2;
      const c = NBF[lead * 6 + d];
      if (c < 0 || b[c] === me) continue;
      if (b[c] === 0) {
        out.push(base | (d << 20) | (li << 26));
        continue;
      }
      let n = 0, t = c;
      while (t >= 0 && b[t] === opp) {
        n++;
        t = NBF[t * 6 + d];
      }
      if (n >= len || (t >= 0 && b[t] !== 0)) continue;
      out.push(base | (d << 20) | (n << 23) | ((t < 0 ? 1 : 0) << 25) | (li << 26));
    } else {
      const a = NBF[g0 * 6 + d], bb = NBF[g1 * 6 + d], cc = len === 3 ? NBF[g2 * 6 + d] : -2;
      if (a < 0 || b[a] !== 0 || bb < 0 || b[bb] !== 0) continue;
      if (len === 3 && (cc < 0 || b[cc] !== 0)) continue;
      out.push(base | (d << 20) | (3 << 26));
    }
  }
}

function genMoves(b: Int8Array, me: number, out: number[]) {
  out.length = 0;
  for (let i = 0; i < N; i++) {
    if (b[i] !== me) continue;
    addGroup(b, me, i, 0, 0, 1, -1, out);
    for (let d = 0; d < 3; d++) {
      const j = NBF[i * 6 + d];
      if (j < 0 || b[j] !== me) continue;
      addGroup(b, me, i, j, 0, 2, d, out);
      const k = NBF[j * 6 + d];
      if (k >= 0 && b[k] === me) addGroup(b, me, i, j, k, 3, d, out);
    }
  }
}

/** Plays a packed move on a copy of the board; returns the copy (captured marble count in `lastCapture`). */
let lastCapture = 0;
function make(b: Int8Array, m: number, me: number): Int8Array {
  const nb = b.slice(), opp = 3 - me, d = mDir(m), len = mLen(m), push = mPush(m);
  lastCapture = 0;
  if (push > 0) {
    const lead = mC(m, mLead(m)), chain = [0, 0];
    let t = NBF[lead * 6 + d];
    for (let k = 0; k < push; k++) {
      chain[k] = t;
      t = NBF[t * 6 + d];
    }
    for (let k = push - 1; k >= 0; k--) {
      const dest = NBF[chain[k] * 6 + d];
      if (dest < 0) lastCapture = 1;
      else nb[dest] = opp;
      nb[chain[k]] = 0;
    }
  }
  for (let k = 0; k < len; k++) nb[mC(m, k)] = 0;
  for (let k = 0; k < len; k++) nb[NBF[mC(m, k) * 6 + d]] = me;
  return nb;
}

/** Number of distinct `who` marbles the side `pusher` could push off in one move. */
function exposed(b: Int8Array, who: number, pusher: number): number {
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (b[i] !== who || RING[i] !== 4) continue;
    // Walk inwards from the rim marble: who-chain of length k backed by a pusher chain longer than k.
    for (let d = 0; d < 6; d++) {
      if (NBF[i * 6 + d] >= 0) continue; // d must point off the board
      const back = (d + 3) % 6;
      let t = i, k = 0;
      while (t >= 0 && b[t] === who && k < 3) {
        k++;
        t = NBF[t * 6 + back];
      }
      if (t < 0 || b[t] !== pusher || k > 2) continue;
      let p = 0;
      while (t >= 0 && b[t] === pusher && p < 3) {
        p++;
        t = NBF[t * 6 + back];
      }
      if (p > k) {
        n++;
        break;
      }
    }
  }
  return n;
}

/** Static score for the side to move. */
function evaluate(b: Int8Array, me: number, lostMe: number, lostOpp: number): number {
  const T = TUNE, lead = lostOpp - lostMe;
  let s = lead * T.material;
  for (let i = 0; i < N; i++) {
    const p = b[i];
    if (!p) continue;
    let v = T.centre[RING[i]];
    for (let d = 0; d < 6; d++) {
      const j = NBF[i * 6 + d];
      if (j >= 0 && b[j] === p) v += T.cohesion;
    }
    // The side that is ahead values the centre more, so it keeps pushing instead of shuffling.
    if (lead !== 0 && (p === me) === lead > 0) v += T.pressAhead * (4 - RING[i]);
    s += p === me ? v : -v;
  }
  s -= exposed(b, me, 3 - me) * T.exposed;
  s += exposed(b, 3 - me, me) * T.attack;
  return s;
}

// ---------------------------------------------------------------- hashing
const Z = (() => {
  let seed = 0x9e3779b9;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
  return { a: Uint32Array.from({ length: N * 3 }, next), b: Uint32Array.from({ length: N * 3 }, next) };
})();
function hashOf(b: Int8Array, me: number, lostMe: number, lostOpp: number): [number, number] {
  let h1 = me * 0x01000193 + lostMe * 0x9e37 + lostOpp * 0x7f4a7c15, h2 = me;
  for (let i = 0; i < N; i++) {
    const p = b[i];
    if (p) {
      h1 ^= Z.a[i * 3 + p];
      h2 ^= Z.b[i * 3 + p];
    }
  }
  return [h1 >>> 0, h2 >>> 0];
}

const EXACT = 0, LOWER = 1, UPPER = 2;
interface TTEntry { check: number; depth: number; score: number; flag: number; move: number }

class Aborted extends Error {}

class Search {
  nodes = 0;
  private tt = new Map<number, TTEntry>();
  private history = new Int32Array(N * 6);
  private buffers: number[][] = Array.from({ length: MAX_DEPTH + QDEPTH + 4 }, () => []);

  constructor(private budget: number) {}

  private order(moves: number[], ttMove: number) {
    const key = (m: number) =>
      (m === ttMove ? 1e9 : 0) + mOff(m) * 1e8 + mPush(m) * 1e7 + mLen(m) * 10 + this.history[mC(m, 0) * 6 + mDir(m)];
    moves.sort((x, y) => key(y) - key(x));
  }

  private quiesce(b: Int8Array, me: number, lostMe: number, lostOpp: number, alpha: number, beta: number, ply: number, qd: number): number {
    if (++this.nodes > this.budget) throw new Aborted();
    const stand = evaluate(b, me, lostMe, lostOpp);
    if (stand >= beta || qd === 0) return stand;
    if (stand > alpha) alpha = stand;
    const moves = this.buffers[ply];
    genMoves(b, me, moves);
    const caps = moves.filter((m) => mOff(m));
    for (const m of caps) {
      const nb = make(b, m, me);
      const score = lostOpp + 1 >= WIN_PUSHES ? WIN - ply - 1 : -this.quiesce(nb, 3 - me, lostOpp + 1, lostMe, -beta, -alpha, ply + 1, qd - 1);
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(b: Int8Array, me: number, lostMe: number, lostOpp: number, depth: number, alpha: number, beta: number, ply: number): number {
    if (depth <= 0) return this.quiesce(b, me, lostMe, lostOpp, alpha, beta, ply, QDEPTH);
    if (++this.nodes > this.budget) throw new Aborted();
    const [h1, h2] = hashOf(b, me, lostMe, lostOpp);
    const e = this.tt.get(h1);
    let ttMove = -1;
    if (e && e.check === h2) {
      ttMove = e.move;
      if (e.depth >= depth) {
        if (e.flag === EXACT) return e.score;
        if (e.flag === LOWER && e.score >= beta) return e.score;
        if (e.flag === UPPER && e.score <= alpha) return e.score;
      }
    }
    const moves = this.buffers[ply];
    genMoves(b, me, moves);
    if (!moves.length) return -WIN + ply; // cannot move: treat as lost
    this.order(moves, ttMove);
    const list = moves.slice();
    const a0 = alpha;
    let best = -Infinity, bestMove = list[0];
    for (const m of list) {
      const nb = make(b, m, me), cap = lastCapture;
      const score = cap && lostOpp + 1 >= WIN_PUSHES
        ? WIN - ply - 1
        : -this.negamax(nb, 3 - me, lostOpp + cap, lostMe, depth - 1, -beta, -alpha, ply + 1);
      if (score > best) {
        best = score;
        bestMove = m;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!mPush(m)) this.history[mC(m, 0) * 6 + mDir(m)] += depth * depth;
        break;
      }
    }
    this.tt.set(h1, { check: h2, depth, score: best, flag: best <= a0 ? UPPER : best >= beta ? LOWER : EXACT, move: bestMove });
    return best;
  }

  /** Iterative deepening at the root; returns the best move of the deepest finished iteration. */
  root(b: Int8Array, me: number, lostMe: number, lostOpp: number, random: () => number, seen: (m: number) => number): { move: number; depth: number; score: number } {
    const moves: number[] = [];
    genMoves(b, me, moves);
    if (!moves.length) return { move: -1, depth: 0, score: -WIN };
    const penalty = new Map(moves.map((m) => [m, seen(m) * TUNE.repeat]));
    // Shuffle first so that equal moves are picked at random, then put captures and pushes in front.
    for (let i = moves.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [moves[i], moves[j]] = [moves[j], moves[i]];
    }
    moves.sort((x, y) => mOff(y) - mOff(x) || mPush(y) - mPush(x));
    let best = moves[0], bestScore = 0, done = 0;
    try {
      for (let depth = 1; depth <= MAX_DEPTH; depth++) {
        let alpha = -Infinity, iterBest = moves[0], iterScore = -Infinity;
        for (const m of moves) {
          const nb = make(b, m, me), cap = lastCapture;
          const score = cap && lostOpp + 1 >= WIN_PUSHES
            ? WIN - 1
            : -this.negamax(nb, 3 - me, lostOpp + cap, lostMe, depth - 1, -Infinity, -alpha - penalty.get(m)!, 1) - penalty.get(m)!;
          if (score > iterScore) {
            iterScore = score;
            iterBest = m;
          }
          if (score > alpha) alpha = score;
        }
        best = iterBest;
        bestScore = iterScore;
        done = depth;
        // best move first in the next iteration
        moves.splice(moves.indexOf(best), 1);
        moves.unshift(best);
        if (Math.abs(bestScore) >= FORCED) break;
      }
    } catch (err) {
      if (!(err instanceof Aborted)) throw err;
    }
    return { move: best, depth: done, score: bestScore };
  }
}

/** Unpacks a search move into the rules' Move shape. */
function toMove(m: number): Move {
  const len = mLen(m), group = Array.from({ length: len }, (_, k) => mC(m, k)), li = mLead(m);
  return { group, dir: mDir(m), push: mPush(m), lead: li === 3 ? -1 : group[li], off: mOff(m) === 1 };
}

export interface SearchResult {
  move: Move | null;
  depth: number;
  score: number;
  nodes: number;
}

export function searchMove(state: TidepoolState, random: () => number = Math.random, budget = HARD_NODES): SearchResult {
  if (state.winner) return { move: null, depth: 0, score: 0, nodes: 0 };
  const me = state.turn === 'X' ? 1 : 2;
  const b = Int8Array.from(state.board, (p) => (p === 'X' ? 1 : p === 'O' ? 2 : 0));
  const opp: Player = state.turn === 'X' ? 'O' : 'X';
  const s = new Search(budget);
  const history = state.history ?? {};
  // How often the position after a move has occurred already this game.
  const seen = (m: number) => {
    const nb = make(b, m, me);
    let k: string = opp;
    for (let i = 0; i < N; i++) k += nb[i] === 1 ? 'X' : nb[i] === 2 ? 'O' : '.';
    return history[k] ?? 0;
  };
  const r = s.root(b, me, state.lost[state.turn], state.lost[opp], random, seen);
  return { move: r.move < 0 ? null : toMove(r.move), depth: r.depth, score: r.score, nodes: s.nodes };
}

