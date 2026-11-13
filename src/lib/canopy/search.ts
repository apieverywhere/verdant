/**
 * Canopy search: negamax with alpha-beta over whole turns (step + grow + optional cut), iterative deepening and
 * a node budget, so the strength does not depend on the machine's speed. The position lives in typed arrays and
 * turns are made and unmade in place; a turn is packed into one integer.
 */
import { BLOSSOM, CELL_COUNT, NB, TREETOP, WIN_LANTERNS, type CanopyState } from './rules';

const N = CELL_COUNT;
const NBF = new Int8Array(N * 8);
NB.forEach((row, i) => row.forEach((j, d) => (NBF[i * 8 + d] = j)));

const WIN = 1_000_000;
const FORCED = WIN - 1_000;
const MAX_DEPTH = 8;
/** About 0.7 s per turn on a laptop (up to ~2 s), 3–4 whole turns deep; the game runs it in a worker, so the scene keeps moving. */
export const HARD_NODES = 250_000;
/** Medium searches the same way with a small budget, so it sees direct threats but not deep plans. */
export const MEDIUM_NODES = 6_000;

/** Evaluation weights. */
export const TUNE = {
  /** One lantern is half of the win. */
  lantern: 150,
  /** Each level a climber stands on: only from a young tree can it reach a treetop. */
  height: 8,
  /** Each tile a climber can step onto. */
  mobility: 1,
  /** A treetop a climber could light next turn, when that would not yet win … */
  reach: 14,
  /** … and when it would be the second lantern (the opponent must answer it). */
  reachWin: 60,
};

/**
 * A whole turn; −1 marks a part that is not played. `to` is −1 when the step is already on the board, `grow` is
 * −1 when the step wins outright (or the grow is already played), and `cut` is −1 to skip cutting.
 */
export interface Turn {
  climber: number;
  to: number;
  grow: number;
  cut: number;
}

const NONE = 63;
const PACK = 1 << 20;
const pack = (w: number, to: number, g: number, c: number) => w | (to << 2) | (g << 8) | (c << 14);
const unpack = (m: number): Turn => {
  const f = (v: number) => (v === NONE ? -1 : v);
  return { climber: m & 3, to: f((m >> 2) & 63), grow: f((m >> 8) & 63), cut: f((m >> 14) & 63) };
};
/** Entry of a generated list: ordering score in the high part, packed turn in the low 20 bits. */
const entry = (order: number, m: number) => Math.max(0, order) * PACK + m;
const turnOf = (e: number) => e % PACK;

/** Mutable search position; sides are 1 (Amber) and 2 (Violet). */
class Pos {
  lv = new Int8Array(N);
  cl = new Int8Array(N);
  occ = new Uint8Array(N);
  w = new Int8Array(4);
  cnt = new Int32Array(3);
  nodes = 0;
  budget = Infinity;
  aborted = false;
  private bufs: number[][] = Array.from({ length: MAX_DEPTH + 2 }, () => []);

  constructor(s: CanopyState) {
    for (let i = 0; i < N; i++) {
      this.lv[i] = s.level[i];
      const c = s.lantern[i] === 'X' ? 1 : s.lantern[i] === 'O' ? 2 : 0;
      this.cl[i] = c;
      this.cnt[c]++;
    }
    s.climbers.forEach((c, k) => {
      this.w[k] = c;
      this.occ[c] = 1;
    });
  }

  /** Ordering bonus for cutting tile `c` (side `side`, the climber standing on `at`), relative to skipping. */
  private cutOrder(side: number, c: number): number {
    const lv = this.lv[c];
    if (lv === TREETOP) return this.cl[c] === 3 - side ? 90 : this.cl[c] === side ? -80 : 25;
    if (lv === BLOSSOM) return -15;
    return lv === TREETOP - 1 ? 6 : -2;
  }

  /** Appends the cut options (skip first) after a grow of `g` by a climber on `at`. */
  private addCuts(side: number, wi: number, n: number, g: number, at: number, base: number, out: number[]) {
    const { lv, occ, w } = this, from = w[wi];
    out.push(entry(base + 10, pack(wi, n, g, NONE)));
    for (let e = 0; e < 8; e++) {
      const c = NBF[at * 8 + e];
      // The climber has moved from `from` to `at`, so `from` is free and `at` is taken.
      if (c < 0 || c === g || (occ[c] && c !== from) || c === at) continue;
      const level = lv[c] + (c === g ? 1 : 0);
      if (level <= 0) continue;
      out.push(entry(base + this.cutOrder(side, c), pack(wi, n, g, c)));
    }
  }

  /** Every whole turn of `side`, best-looking first. */
  gen(side: number, out: number[]) {
    const { lv, cl, occ, w, cnt } = this, opp = 3 - side;
    for (let wi = side * 2 - 2; wi < side * 2; wi++) {
      const f = w[wi];
      for (let d = 0; d < 8; d++) {
        const n = NBF[f * 8 + d];
        if (n < 0 || occ[n] || lv[n] >= BLOSSOM || lv[n] > lv[f] + 1) continue;
        const lights = lv[n] === TREETOP && cl[n] !== side;
        if (lights && cnt[side] + 1 >= WIN_LANTERNS) {
          out.push(entry(5000, pack(wi, n, NONE, NONE)));
          continue;
        }
        const base = 300 + (lights ? (cl[n] === opp ? 90 : 60) : 0) + (lv[n] - lv[f]) * 6;
        for (let e = 0; e < 8; e++) {
          const g = NBF[n * 8 + e];
          if (g < 0 || lv[g] >= BLOSSOM || (occ[g] && g !== f)) continue;
          let o = base;
          if (lv[g] === TREETOP) o += cl[g] === opp ? 50 : cl[g] === side ? -60 : -4;
          else if (lv[g] === TREETOP - 1) o += lv[n] >= TREETOP - 1 ? 8 : -6;
          this.addCuts(side, wi, n, g, n, o, out);
        }
      }
    }
    out.sort((a, b) => b - a);
  }

  /** Score for `side`, who is about to move at `ply`. */
  evaluate(side: number, ply: number): number {
    const { lv, cl, occ, w, cnt } = this;
    let score = 0, myMoves = 0, myReach = 0;
    for (let wi = 0; wi < 4; wi++) {
      const o = wi < 2 ? 1 : 2, f = w[wi], h = lv[f];
      let moves = 0, reach = 0;
      for (let d = 0; d < 8; d++) {
        const n = NBF[f * 8 + d];
        if (n < 0 || occ[n] || lv[n] >= BLOSSOM || lv[n] > h + 1) continue;
        moves++;
        if (lv[n] === TREETOP && cl[n] !== o) reach++;
      }
      const v = h * TUNE.height + moves * TUNE.mobility + reach * (cnt[o] >= WIN_LANTERNS - 1 ? TUNE.reachWin : TUNE.reach);
      if (o === side) {
        score += v;
        myMoves += moves;
        myReach += reach;
      } else score -= v;
    }
    if (!myMoves) return -(WIN - ply);
    if (myReach && cnt[side] >= WIN_LANTERNS - 1) return WIN - ply; // lights the winning lantern right now
    return score + (cnt[side] - cnt[3 - side]) * TUNE.lantern;
  }

  /** Changes tile `c` by `delta` stages; returns the lantern owner it put out (0 = none). */
  private shift(c: number, delta: number): number {
    const { lv, cl, cnt } = this;
    lv[c] += delta;
    const out = (lv[c] >= BLOSSOM || lv[c] < TREETOP) && cl[c] ? cl[c] : 0;
    if (out) {
      cnt[out]--;
      cl[c] = 0;
      cnt[0]++;
    }
    return out;
  }
  private unshift(c: number, delta: number, out: number) {
    const { lv, cl, cnt } = this;
    if (out) {
      cnt[0]--;
      cl[c] = out;
      cnt[out]++;
    }
    lv[c] -= delta;
  }

  /** Plays a packed turn, searches the reply and takes the turn back. Returns the score for `side`. */
  play(m: number, side: number, depth: number, alpha: number, beta: number, ply: number): number {
    const { lv, cl, occ, w, cnt } = this;
    const wi = m & 3, n = (m >> 2) & 63, g = (m >> 8) & 63, c = (m >> 14) & 63, f = w[wi];
    let prev = 0, lit = false;
    if (n !== NONE) {
      prev = cl[n];
      occ[f] = 0;
      occ[n] = 1;
      w[wi] = n;
      if (lv[n] === TREETOP && prev !== side) {
        cnt[prev]--;
        cl[n] = side;
        cnt[side]++;
        lit = true;
      }
    }
    let score: number;
    if (n !== NONE && g === NONE) score = WIN - ply; // the step lit the second lantern
    else {
      const gOut = g !== NONE ? this.shift(g, 1) : 0;
      const cOut = c !== NONE ? this.shift(c, -1) : 0;
      score = -this.negamax(3 - side, depth - 1, -beta, -alpha, ply + 1);
      if (c !== NONE) this.unshift(c, -1, cOut);
      if (g !== NONE) this.unshift(g, 1, gOut);
    }
    if (n !== NONE) {
      if (lit) {
        cnt[side]--;
        cl[n] = prev;
        cnt[prev]++;
      }
      w[wi] = f;
      occ[n] = 0;
      occ[f] = 1;
    }
    return score;
  }

  negamax(side: number, depth: number, alpha: number, beta: number, ply: number): number {
    if (++this.nodes > this.budget) {
      this.aborted = true;
      return 0;
    }
    if (depth <= 0) return this.evaluate(side, ply);
    const moves = this.bufs[ply];
    moves.length = 0;
    this.gen(side, moves);
    if (!moves.length) return -(WIN - ply);
    let best = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      const v = this.play(turnOf(moves[i]), side, depth, alpha, beta, ply);
      if (this.aborted) return 0;
      if (v > best) {
        best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
    }
    return best;
  }

  /** Root turns for whatever part of the turn is left: all of it, the grow and cut, or just the cut. */
  rootTurns(s: CanopyState): number[] {
    const side = s.turn === 'X' ? 1 : 2, out: number[] = [];
    if (s.phase === 'move') this.gen(side, out);
    else {
      const wi = s.active, at = this.w[wi];
      // The climber already stands on `at`: pretend it came from there, so `from` is not freed twice.
      if (s.phase === 'grow') {
        for (let e = 0; e < 8; e++) {
          const g = NBF[at * 8 + e];
          if (g >= 0 && !this.occ[g] && this.lv[g] < BLOSSOM) this.addCutsAt(side, wi, g, at, out);
        }
      } else this.addCutsAt(side, wi, s.lastGrow, at, out, true);
      out.sort((a, b) => b - a);
    }
    return out.map(turnOf);
  }

  /** Cut options for a climber that is already on `at` (no step in the turn). */
  private addCutsAt(side: number, wi: number, g: number, at: number, out: number[], grown = false) {
    const gp = grown ? NONE : g;
    out.push(entry(310, pack(wi, NONE, gp, NONE)));
    for (let e = 0; e < 8; e++) {
      const c = NBF[at * 8 + e];
      if (c < 0 || c === g || this.occ[c]) continue;
      if (this.lv[c] + (!grown && c === g ? 1 : 0) <= 0) continue;
      out.push(entry(300 + this.cutOrder(side, c), pack(wi, NONE, gp, c)));
    }
  }
}

export interface SearchResult {
  turn: Turn | null;
  score: number;
  depth: number;
  nodes: number;
}

function shuffle(a: number[], random: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/** Every legal remaining turn for the side to move. */
export function legalTurns(s: CanopyState): Turn[] {
  return s.winner ? [] : new Pos(s).rootTurns(s).map(unpack);
}

/** One whole turn deep, every root turn scored exactly, plus `noise` points of random jitter on each: Easy. */
export function greedyTurn(s: CanopyState, noise: number, random: () => number = Math.random): SearchResult {
  if (s.winner) return { turn: null, score: 0, depth: 0, nodes: 0 };
  const pos = new Pos(s), side = s.turn === 'X' ? 1 : 2;
  let best = -Infinity, pick = -1;
  for (const m of pos.rootTurns(s)) {
    const v = pos.play(m, side, 1, -Infinity, Infinity, 0) + random() * noise;
    if (v > best) {
      best = v;
      pick = m;
    }
  }
  return { turn: pick < 0 ? null : unpack(pick), score: best, depth: 1, nodes: pos.nodes };
}

/** Iterative deepening within a node budget. Equal turns are broken at random so games differ. */
export function searchTurn(s: CanopyState, random: () => number = Math.random, budget = HARD_NODES): SearchResult {
  if (s.winner) return { turn: null, score: 0, depth: 0, nodes: 0 };
  const pos = new Pos(s), side = s.turn === 'X' ? 1 : 2;
  let turns = pos.rootTurns(s);
  if (!turns.length) return { turn: null, score: 0, depth: 0, nodes: 0 };
  // Shuffle, then let a stable sort by the generator's order keep random ties among equally ordered turns.
  shuffle(turns, random);
  let result: SearchResult = { turn: unpack(turns[0]), score: 0, depth: 0, nodes: 0 };
  pos.budget = budget;
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    const scored: [number, number][] = [];
    let alpha = -Infinity, best = -Infinity, pick = turns[0];
    for (const m of turns) {
      const v = pos.play(m, side, depth, alpha, Infinity, 0);
      if (pos.aborted) break;
      scored.push([m, v]);
      if (v > best) {
        best = v;
        pick = m;
        alpha = v;
      }
    }
    // A partly searched depth still counts once its first turn (the previous best) was searched fully: the pick
    // is then at least as good as that turn at the new depth.
    if (pos.aborted) {
      if (scored.length) result = { turn: unpack(pick), score: best, depth, nodes: pos.nodes };
      break;
    }
    result = { turn: unpack(pick), score: best, depth, nodes: pos.nodes };
    if (Math.abs(best) >= FORCED) break;
    scored.sort((a, b) => b[1] - a[1]);
    turns = scored.map((x) => x[0]);
  }
  result.nodes = Math.min(pos.nodes, budget);
  return result;
}
