/**
 * Tidepool engine: Pearl (X) vs Coral (O) on a 61-hole hexagonal board (axial coordinates, radius 4).
 * On a turn a player moves 1–3 of their own marbles that sit in a straight line by one hole, either along
 * the line (which may push a smaller line of opponent marbles) or sideways into empty holes. A marble pushed
 * past the edge leaves the board; the first player to push off 6 opponent marbles wins.
 * Ported from the design's Tidepool artboard.
 */
import { other } from '../game/rules';
import type { Cell, Player } from '../game/types';

export { other };

export const RADIUS = 4;
export const START_MARBLES = 14;
export const WIN_PUSHES = 6;

/** Axial directions in order: E, NE, NW, W, SW, SE (r grows towards the near side of the board). */
export const DIRS: readonly [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const DIR_NAMES = ['east', 'north-east', 'north-west', 'west', 'south-west', 'south-east'] as const;

export interface HexCell {
  q: number;
  r: number;
  /** Distance from the centre, 0–4. */
  ring: number;
}

/** Board cells, row by row (r = −4 … 4), each row left to right. */
export const CELLS: HexCell[] = [];
const CIDX = new Map<string, number>();
for (let r = -RADIUS; r <= RADIUS; r++) {
  for (let q = -RADIUS; q <= RADIUS; q++) {
    if (Math.abs(q + r) > RADIUS) continue;
    CIDX.set(`${q},${r}`, CELLS.length);
    CELLS.push({ q, r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) });
  }
}
export const CELL_COUNT = CELLS.length;

/** NB[cell][dir] = neighbouring cell, or −1 past the edge. */
export const NB: number[][] = CELLS.map((c) => DIRS.map(([dq, dr]) => CIDX.get(`${c.q + dq},${c.r + dr}`) ?? -1));

export interface Move {
  /** The moving marbles, ordered along their line. */
  group: number[];
  dir: number;
  /** Number of opponent marbles pushed (0 for plain and sideways moves). */
  push: number;
  /** Front marble for an inline move (it moves into the target hole), −1 for a sideways move. */
  lead: number;
  /** Whether the push sends the last opponent marble off the board. */
  off: boolean;
}

/** One marble's step in a move, for animation. */
export interface Shift {
  id: number;
  from: number;
  to: number;
  pushed: boolean;
}

export interface MoveResult {
  player: Player;
  move: Move;
  shifts: Shift[];
  /** Marble pushed off the board this move, with its tray slot. */
  off: { id: number; from: number; slot: number } | null;
  /** Where the moving player's marbles landed. */
  landed: number[];
}

export interface TidepoolState {
  board: Cell[];
  /** Marble id in each hole, −1 when empty. Ids stay with a marble for its whole life (animation). */
  ids: number[];
  /** Owner of each marble id. */
  owners: Player[];
  turn: Player;
  /** Marbles each player has lost to the sea. */
  lost: Record<Player, number>;
  winner: Player | null;
  last: MoveResult | null;
  moveCount: number;
  /** positionKey → times the position has occurred this game (lets the computer avoid going round in circles). */
  history: Record<string, number>;
}

/** Starting rows: Coral on the far two rows plus three in the middle of the third, Pearl mirrored. */
export function startBoard(): Cell[] {
  return CELLS.map((c) => {
    if (c.r === -4 || c.r === -3 || (c.r === -2 && c.q >= 0 && c.q <= 2)) return 'O';
    if (c.r === 4 || c.r === 3 || (c.r === 2 && c.q >= -2 && c.q <= 0)) return 'X';
    return null;
  });
}

export function createGame(starter: Player = 'X'): TidepoolState {
  const board = startBoard(), ids = Array<number>(CELL_COUNT).fill(-1), owners: Player[] = [];
  board.forEach((p, i) => {
    if (p) {
      ids[i] = owners.length;
      owners.push(p);
    }
  });
  return { board, ids, owners, turn: starter, lost: { X: 0, O: 0 }, winner: null, last: null, moveCount: 0, history: { [positionKey(board, starter)]: 1 } };
}

/** Compact key of a position: one character per hole plus the side to move. */
export function positionKey(board: readonly Cell[], turn: Player): string {
  let k = turn;
  for (const c of board) k += c ?? '.';
  return k;
}

/** Orders a selection into a straight, contiguous line of 1–3 cells, or returns null. */
export function lineOf(sel: readonly number[]): number[] | null {
  if (sel.length === 0 || sel.length > 3) return null;
  if (sel.length === 1) return [sel[0]];
  for (let d = 0; d < 3; d++) {
    for (const start of sel) {
      const line = [start];
      let cur = start;
      for (let k = 1; k < sel.length; k++) {
        cur = NB[cur][d];
        if (cur < 0 || !sel.includes(cur)) break;
        line.push(cur);
      }
      if (line.length === sel.length) return line;
    }
  }
  return null;
}

function groupDir(g: readonly number[]): number {
  if (g.length < 2) return -1;
  for (let d = 0; d < 6; d++) if (NB[g[0]][d] === g[1]) return d;
  return -1;
}

/** Legal moves for one ordered line of the player's marbles. */
export function movesForGroup(b: readonly Cell[], g: number[], me: Player): Move[] {
  const opp = other(me), out: Move[] = [], ad = groupDir(g);
  for (let d = 0; d < 6; d++) {
    const inline = g.length === 1 || d === ad || d === (ad + 3) % 6;
    if (inline) {
      const lead = g.length === 1 ? g[0] : d === ad ? g[g.length - 1] : g[0];
      const c = NB[lead][d];
      if (c < 0 || b[c] === me) continue;
      if (b[c] === null) {
        out.push({ group: g, dir: d, push: 0, lead, off: false });
        continue;
      }
      let n = 0, t = c;
      while (t >= 0 && b[t] === opp) {
        n++;
        t = NB[t][d];
      }
      if (n >= g.length) continue; // only a bigger line can push
      if (t >= 0 && b[t] !== null) continue; // blocked by one of our own marbles
      out.push({ group: g, dir: d, push: n, lead, off: t < 0 });
    } else {
      if (g.every((cell) => NB[cell][d] >= 0 && b[NB[cell][d]] === null)) out.push({ group: g, dir: d, push: 0, lead: -1, off: false });
    }
  }
  return out;
}

/** Every legal move for a player (each line counted once). */
export function allMoves(b: readonly Cell[], me: Player): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (b[i] !== me) continue;
    out.push(...movesForGroup(b, [i], me));
    for (let d = 0; d < 3; d++) {
      const j = NB[i][d];
      if (j < 0 || b[j] !== me) continue;
      out.push(...movesForGroup(b, [i, j], me));
      const k = NB[j][d];
      if (k >= 0 && b[k] === me) out.push(...movesForGroup(b, [i, j, k], me));
    }
  }
  return out;
}

/** Board-only move, used by the search: returns the new board and lost counts. */
export function applyBoard(b: readonly Cell[], lost: Record<Player, number>, mv: Move, me: Player) {
  const nb = b.slice(), nl = { X: lost.X, O: lost.O }, opp = other(me), d = mv.dir;
  if (mv.push > 0) {
    const chain: number[] = [];
    let t = NB[mv.lead][d];
    for (let k = 0; k < mv.push; k++) {
      chain.push(t);
      t = NB[t][d];
    }
    for (let m = chain.length - 1; m >= 0; m--) {
      const dest = NB[chain[m]][d];
      if (dest < 0) nl[opp]++;
      else nb[dest] = opp;
      nb[chain[m]] = null;
    }
  }
  for (const c of mv.group) nb[c] = null;
  for (const c of mv.group) nb[NB[c][d]] = me;
  return { board: nb, lost: nl };
}

const sameMove = (a: Move, b: Move) =>
  a.dir === b.dir && a.group.length === b.group.length && a.group.every((c) => b.group.includes(c));

/** Plays a move for the side to move; an illegal move returns the same state object. */
export function applyMove(s: TidepoolState, mv: Move): TidepoolState {
  if (s.winner) return s;
  const me = s.turn, line = lineOf(mv.group);
  if (!line || line.some((c) => s.board[c] !== me)) return s;
  const legal = movesForGroup(s.board, line, me).find((m) => sameMove(m, mv));
  if (!legal) return s;

  const opp = other(me), d = legal.dir;
  const board = s.board.slice(), ids = s.ids.slice(), lost = { ...s.lost }, shifts: Shift[] = [];
  let off: MoveResult['off'] = null;
  if (legal.push > 0) {
    const chain: number[] = [];
    let t = NB[legal.lead][d];
    for (let k = 0; k < legal.push; k++) {
      chain.push(t);
      t = NB[t][d];
    }
    for (let m = chain.length - 1; m >= 0; m--) {
      const c = chain[m], dest = NB[c][d], id = ids[c];
      if (dest < 0) {
        off = { id, from: c, slot: lost[opp] };
        lost[opp]++;
      } else {
        board[dest] = opp;
        ids[dest] = id;
        shifts.push({ id, from: c, to: dest, pushed: true });
      }
      board[c] = null;
      ids[c] = -1;
    }
  }
  const moving = legal.group.map((c) => ids[c]);
  for (const c of legal.group) {
    board[c] = null;
    ids[c] = -1;
  }
  const landed = legal.group.map((c, k) => {
    const dest = NB[c][d];
    board[dest] = me;
    ids[dest] = moving[k];
    shifts.push({ id: moving[k], from: c, to: dest, pushed: false });
    return dest;
  });
  const winner = lost[opp] >= WIN_PUSHES ? me : null;
  const key = positionKey(board, winner ? me : opp);
  return {
    ...s,
    board,
    ids,
    lost,
    turn: winner ? me : opp,
    winner,
    last: { player: me, move: legal, shifts, off, landed },
    moveCount: s.moveCount + 1,
    history: { ...s.history, [key]: (s.history[key] ?? 0) + 1 },
  };
}

/** Human-readable cell name for the keyboard controls: row 1 is the far (Coral) side. */
export function cellName(i: number): string {
  const c = CELLS[i], row = c.r + RADIUS + 1, first = Math.max(-RADIUS, -RADIUS - c.r);
  return `row ${row}, hole ${c.q - first + 1}`;
}
