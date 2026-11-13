/**
 * Canopy engine: Amber (X) vs Violet (O) on a 5×5 forest board, two climbers a side.
 * A turn has three parts:
 * 1. Step one climber onto one of the 8 tiles around it (up at most one level, down any number).
 * 2. Grow one free tile next to that climber by one stage: moss → sapling → young tree → treetop → blossom.
 * 3. Optionally cut one free, grown tile next to that climber back by one stage (not the tile just grown).
 * Stepping onto a treetop lights a lantern there in your colour (or takes over your rival's); it stays lit after
 * you leave. A blossom cannot be stood on; a tile that grows into a blossom or is cut below a treetop loses its
 * lantern. Two lanterns of your colour lit at once win the round; a player who cannot step on their turn loses.
 * Because trees can be cut back, a round has no built-in end otherwise: players start a new game themselves.
 */
import { other } from '../game/rules';
import type { Cell, Player } from '../game/types';

export { other };

export const SIZE = 5;
export const CELL_COUNT = SIZE * SIZE;
/** Growth stage that carries a lantern. */
export const TREETOP = 3;
/** Final stage: nobody can stand on it. */
export const BLOSSOM = 4;
export const WIN_LANTERNS = 2;
export const STAGE_NAMES = ['moss', 'sapling', 'young tree', 'treetop', 'blossom'] as const;

/** The 8 directions as [column, row] steps; rows grow towards the near side of the board. */
export const DIRS: readonly [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

export const cellAt = (col: number, row: number) => row * SIZE + col;
export const colOf = (cell: number) => cell % SIZE;
export const rowOf = (cell: number) => Math.floor(cell / SIZE);

/** NB[cell][dir] = neighbouring cell, or −1 past the edge. */
export const NB: number[][] = Array.from({ length: CELL_COUNT }, (_, i) =>
  DIRS.map(([dc, dr]) => {
    const c = colOf(i) + dc, r = rowOf(i) + dr;
    return c >= 0 && c < SIZE && r >= 0 && r < SIZE ? cellAt(c, r) : -1;
  }),
);

/** Rows are counted from the far side, columns from the left. */
export const cellName = (cell: number) => `row ${rowOf(cell) + 1}, column ${colOf(cell) + 1}`;

/** Climbers 0 and 1 are Amber's, 2 and 3 Violet's. */
export const ownerOf = (climber: number): Player => (climber < 2 ? 'X' : 'O');
export const climbersOf = (p: Player): readonly [number, number] => (p === 'X' ? [0, 1] : [2, 3]);

export type Phase = 'move' | 'grow' | 'cut';

export type LastAction =
  | { kind: 'step'; climber: number; from: number; to: number; /** Whether the step lit or took over a lantern. */ lit: boolean }
  | { kind: 'grow'; cell: number; /** Stage the tile grew to. */ level: number }
  | { kind: 'cut'; cell: number; /** Stage the tile was cut back to. */ level: number }
  | { kind: 'skip' };

export interface CanopyState {
  /** Growth stage of each tile, 0 (moss) … 4 (blossom). */
  level: number[];
  /** Owner of the lantern on each tile; only treetops carry one. */
  lantern: Cell[];
  /** Tile of each climber, indexed as in `ownerOf`. */
  climbers: number[];
  turn: Player;
  phase: Phase;
  /** The climber that just stepped and now grows (and may cut); −1 in the move phase. */
  active: number;
  winner: Player | null;
  reason: 'lanterns' | 'stuck' | null;
  last: LastAction | null;
  /** Tiles of the latest step, grow and cut (−1 = none this turn), for highlights. */
  lastStep: number;
  lastGrow: number;
  lastCut: number;
  /** Steps, grows, cuts and skips played so far; the scene animates when it changes. */
  actionCount: number;
}

/** Amber starts on the near edge, Violet mirrored on the far edge. */
export function createGame(starter: Player = 'X'): CanopyState {
  return {
    level: Array(CELL_COUNT).fill(0),
    lantern: Array(CELL_COUNT).fill(null),
    climbers: [cellAt(1, 4), cellAt(3, 4), cellAt(3, 0), cellAt(1, 0)],
    turn: starter,
    phase: 'move',
    active: -1,
    winner: null,
    reason: null,
    last: null,
    lastStep: -1,
    lastGrow: -1,
    lastCut: -1,
    actionCount: 0,
  };
}

type Board = Pick<CanopyState, 'level' | 'lantern' | 'climbers'>;

export const lanternCount = (s: Pick<CanopyState, 'lantern'>, p: Player) => s.lantern.reduce((n, o) => n + (o === p ? 1 : 0), 0);

/** Tiles the climber may step onto: free, not a blossom, and at most one level up. */
export function stepTargets(s: Board, climber: number): number[] {
  const from = s.climbers[climber], out: number[] = [];
  for (const n of NB[from]) {
    if (n < 0 || s.climbers.includes(n) || s.level[n] >= BLOSSOM || s.level[n] > s.level[from] + 1) continue;
    out.push(n);
  }
  return out;
}

/** Tiles the climber may grow: any free tile around it that is not yet a blossom. */
export function growTargets(s: Board, climber: number): number[] {
  return NB[s.climbers[climber]].filter((n) => n >= 0 && !s.climbers.includes(n) && s.level[n] < BLOSSOM);
}

/** Tiles the climber may cut back: any free, grown tile around it except the one grown this turn (`grown`). */
export function cutTargets(s: Board, climber: number, grown = -1): number[] {
  return NB[s.climbers[climber]].filter((n) => n >= 0 && n !== grown && !s.climbers.includes(n) && s.level[n] > 0);
}

/** A climber that can step can always grow afterwards (the tile it left is free), so stepping is all that counts. */
export const hasMove = (s: Board, p: Player) => climbersOf(p).some((c) => stepTargets(s, c).length > 0);

/** Passes the turn; the next player loses at once if none of their climbers can step. */
function endTurn(s: CanopyState, patch: Partial<CanopyState>): CanopyState {
  const next = { ...s, ...patch, turn: other(s.turn), phase: 'move' as Phase, active: -1, actionCount: s.actionCount + 1 };
  if (!hasMove(next, next.turn)) return { ...next, winner: s.turn, reason: 'stuck' };
  return next;
}

/** Steps a climber of the side to move. Returns the same state when the step is not legal. */
export function step(s: CanopyState, climber: number, to: number): CanopyState {
  if (s.winner || s.phase !== 'move' || ownerOf(climber) !== s.turn || !stepTargets(s, climber).includes(to)) return s;
  const me = s.turn, from = s.climbers[climber];
  const climbers = s.climbers.slice(), lantern = s.lantern.slice();
  climbers[climber] = to;
  const lit = s.level[to] === TREETOP && lantern[to] !== me;
  if (lit) lantern[to] = me;
  const won = lanternCount({ lantern }, me) >= WIN_LANTERNS;
  return {
    ...s,
    climbers,
    lantern,
    phase: won ? 'move' : 'grow',
    active: won ? -1 : climber,
    winner: won ? me : null,
    reason: won ? 'lanterns' : null,
    last: { kind: 'step', climber, from, to, lit },
    lastStep: to,
    lastGrow: -1,
    lastCut: -1,
    actionCount: s.actionCount + 1,
  };
}

/**
 * Grows a tile next to the climber that just stepped. The player may then cut a tile; when there is nothing to
 * cut, the turn passes straight away. Returns the same state when not legal.
 */
export function grow(s: CanopyState, cell: number): CanopyState {
  if (s.winner || s.phase !== 'grow' || !growTargets(s, s.active).includes(cell)) return s;
  const level = s.level.slice(), lantern = s.lantern.slice();
  level[cell]++;
  if (level[cell] >= BLOSSOM) lantern[cell] = null;
  const last: LastAction = { kind: 'grow', cell, level: level[cell] };
  if (!cutTargets({ level, lantern, climbers: s.climbers }, s.active, cell).length) {
    return endTurn(s, { level, lantern, last, lastGrow: cell });
  }
  return { ...s, level, lantern, phase: 'cut', last, lastGrow: cell, actionCount: s.actionCount + 1 };
}

/** Cuts a tile next to the active climber back one stage and passes the turn. Returns the same state when not legal. */
export function cut(s: CanopyState, cell: number): CanopyState {
  if (s.winner || s.phase !== 'cut' || !cutTargets(s, s.active, s.lastGrow).includes(cell)) return s;
  const level = s.level.slice(), lantern = s.lantern.slice();
  level[cell]--;
  if (level[cell] < TREETOP) lantern[cell] = null;
  return endTurn(s, { level, lantern, last: { kind: 'cut', cell, level: level[cell] }, lastCut: cell });
}

/** Ends the turn without cutting. Returns the same state when not in the cut phase. */
export function skipCut(s: CanopyState): CanopyState {
  if (s.winner || s.phase !== 'cut') return s;
  return endTurn(s, { last: { kind: 'skip' } });
}
