/**
 * Ember & Tide engine: pieces drop into 25 columns of a 5×5×5 grid; 4 in a row in any 3D direction wins.
 * Cell index = x + 5·z + 25·y (y = height), column index = x + 5·z. X is Fire, O is Water.
 */
import { other } from '../game/rules';
import type { Cell, Outcome, Player } from '../game/types';

export const SIZE = 5;
export const COLUMNS = SIZE * SIZE;
export const CELLS = COLUMNS * SIZE;
export const WIN_LENGTH = 4;

export interface FireWaterState {
  /** 125 cells, index = x + 5·z + 25·y. */
  board: Cell[];
  turn: Player;
  /** 'D' = draw (board full). */
  winner: Outcome | null;
  line: number[] | null;
  moveCount: number;
}

/** Every winning line, and for each cell the ids of the lines through it. */
export const { LINES, CELL_LINES } = (() => {
  const dirs: [number, number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        // Keep one of each ± pair: the first non-zero component is positive.
        if ((dx || dy || dz) > 0) dirs.push([dx, dy, dz]);
      }
    }
  }
  const inside = (v: number) => v >= 0 && v < SIZE;
  const lines: number[][] = [];
  const cellLines: number[][] = Array.from({ length: CELLS }, () => []);
  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        for (const [dx, dy, dz] of dirs) {
          const reach = WIN_LENGTH - 1;
          if (!inside(x + reach * dx) || !inside(y + reach * dy) || !inside(z + reach * dz)) continue;
          const line = Array.from({ length: WIN_LENGTH }, (_, k) => x + k * dx + SIZE * (z + k * dz) + COLUMNS * (y + k * dy));
          for (const cell of line) cellLines[cell].push(lines.length);
          lines.push(line);
        }
      }
    }
  }
  return { LINES: lines, CELL_LINES: cellLines };
})();

export function createGame(starter: Player = 'X'): FireWaterState {
  return { board: Array(CELLS).fill(null), turn: starter, winner: null, line: null, moveCount: 0 };
}

/** Lowest free cell of a column, or −1 when the column is full. */
export function dropCell(board: readonly Cell[], col: number): number {
  for (let y = 0; y < SIZE; y++) {
    const i = col + COLUMNS * y;
    if (!board[i]) return i;
  }
  return -1;
}

export function stackHeight(board: readonly Cell[], col: number): number {
  const i = dropCell(board, col);
  return i < 0 ? SIZE : Math.floor(i / COLUMNS);
}

/** True if `player` at `cell` would complete a line, whatever `cell` holds now. */
export function wouldWin(board: readonly Cell[], cell: number, player: Player): boolean {
  return CELL_LINES[cell].some((id) => LINES[id].every((c) => c === cell || board[c] === player));
}

function lineThrough(board: readonly Cell[], cell: number, player: Player): number[] | null {
  const id = CELL_LINES[cell].find((l) => LINES[l].every((c) => board[c] === player));
  return id === undefined ? null : LINES[id];
}

/** Drops a piece into `col` for the player to move. Returns the same state object when the move is illegal. */
export function applyMove(state: FireWaterState, col: number): FireWaterState {
  if (state.winner || !Number.isInteger(col) || col < 0 || col >= COLUMNS) return state;
  const cell = dropCell(state.board, col);
  if (cell < 0) return state;
  const p = state.turn;
  const board = state.board.slice();
  board[cell] = p;
  const moveCount = state.moveCount + 1;
  const line = lineThrough(board, cell, p);
  if (line) return { board, turn: p, winner: p, line, moveCount };
  return { board, turn: other(p), winner: moveCount >= CELLS ? 'D' : null, line: null, moveCount };
}
