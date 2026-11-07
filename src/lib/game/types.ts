export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Outcome = Player | 'D';
export type Mode = 'pvp' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  /** 9 cells, index = row * 3 + col. */
  board: Cell[];
  /** Cells of each player in placement order, oldest first (length ≤ MAX_PIECES). */
  queues: Record<Player, number[]>;
  turn: Player;
  /** 'D' = draw (threefold repetition). */
  winner: Outcome | null;
  line: number[] | null;
  /** positionKey → number of times the position occurred. */
  history: Record<string, number>;
  lastRemoved: { cell: number; player: Player } | null;
  moveCount: number;
}
