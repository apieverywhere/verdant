import type { Cell, GameState, Player } from './types';

export const MAX_PIECES = 3;
export const REPETITION_LIMIT = 3;

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const other = (p: Player): Player => (p === 'X' ? 'O' : 'X');

export function findLine(board: readonly Cell[], player: Player): number[] | null {
  for (const l of LINES) {
    if (board[l[0]] === player && board[l[1]] === player && board[l[2]] === player) return [...l];
  }
  return null;
}

export function positionKey(board: readonly Cell[], queues: Record<Player, number[]>, turn: Player): string {
  return board.map((c) => c ?? '.').join('') + '|' + queues.X.join('') + '|' + queues.O.join('') + '|' + turn;
}

export function createGame(starter: Player = 'X'): GameState {
  const board: Cell[] = Array(9).fill(null);
  const queues = { X: [], O: [] };
  return {
    board,
    queues,
    turn: starter,
    winner: null,
    line: null,
    history: { [positionKey(board, queues, starter)]: 1 },
    lastRemoved: null,
    moveCount: 0,
  };
}

export function legalMoves(state: GameState): number[] {
  if (state.winner) return [];
  const moves: number[] = [];
  for (let i = 0; i < 9; i++) if (!state.board[i]) moves.push(i);
  return moves;
}

/** The cell of the piece that vanishes if the player to move plays now, or null. */
export function vanishingCell(state: GameState): number | null {
  if (state.winner) return null;
  const q = state.queues[state.turn];
  return q.length === MAX_PIECES ? q[0] : null;
}

/**
 * Plays `cell` for the player to move. Returns the same state object when the move is illegal.
 * The mover's oldest piece is removed *before* the win check, so at most 3 pieces per side ever exist.
 */
export function applyMove(state: GameState, cell: number): GameState {
  if (state.winner || !Number.isInteger(cell) || cell < 0 || cell > 8 || state.board[cell]) return state;
  const p = state.turn;
  const board = state.board.slice();
  const queues = { X: state.queues.X.slice(), O: state.queues.O.slice() };
  board[cell] = p;
  queues[p].push(cell);
  let lastRemoved: GameState['lastRemoved'] = null;
  if (queues[p].length > MAX_PIECES) {
    const old = queues[p].shift()!;
    board[old] = null;
    lastRemoved = { cell: old, player: p };
  }
  const base = { board, queues, lastRemoved, moveCount: state.moveCount + 1 };
  const line = findLine(board, p);
  if (line) return { ...base, turn: p, winner: p, line, history: state.history };

  const turn = other(p);
  const key = positionKey(board, queues, turn);
  const count = (state.history[key] ?? 0) + 1;
  const history = { ...state.history, [key]: count };
  return { ...base, turn, winner: count >= REPETITION_LIMIT ? 'D' : null, line: null, history };
}
