/** Match-level state (scores, mode, difficulty, alternating starter) as a pure reducer. */
import { aiPlayer } from './ai';
import { applyMove, createGame, other } from './rules';
import type { Difficulty, GameState, Mode, Outcome, Player } from './types';

export interface Scores { X: number; O: number; D: number }

export interface MatchState {
  game: GameState;
  mode: Mode;
  difficulty: Difficulty;
  scores: Scores;
  starter: Player;
  /** Increments on every new board so the scene can clear without animations. */
  gameId: number;
}

export type MatchAction =
  | { type: 'play'; cell: number; source: 'human' | 'ai' }
  | { type: 'newGame' }
  | { type: 'resetScores' }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setDifficulty'; difficulty: Difficulty };

const ZERO: Scores = { X: 0, O: 0, D: 0 };

export function initialMatch(mode: Mode = 'pvp', difficulty: Difficulty = 'hard'): MatchState {
  return { game: createGame('X'), mode, difficulty, scores: ZERO, starter: 'X', gameId: 0 };
}

export const isAiTurn = (m: MatchState) => m.mode === 'ai' && !m.game.winner && m.game.turn === aiPlayer;

/** The loser of a decided round goes first next; after a draw or an unfinished round the starter alternates (R1.2). */
export function nextStarter(starter: Player, winner: Outcome | null): Player {
  return winner === 'X' || winner === 'O' ? other(winner) : other(starter);
}

/** Fresh board; X starts again when scores are cleared, otherwise see `nextStarter`. */
function fresh(m: MatchState, clearScores: boolean, patch: Partial<MatchState> = {}): MatchState {
  const starter: Player = clearScores ? 'X' : nextStarter(m.starter, m.game.winner);
  return { ...m, ...patch, game: createGame(starter), starter, scores: clearScores ? ZERO : m.scores, gameId: m.gameId + 1 };
}

export function matchReducer(m: MatchState, a: MatchAction): MatchState {
  switch (a.type) {
    case 'play': {
      if (a.source === 'human' && isAiTurn(m)) return m;
      if (a.source === 'ai' && !isAiTurn(m)) return m;
      const game = applyMove(m.game, a.cell);
      if (game === m.game) return m;
      const scores = game.winner ? { ...m.scores, [game.winner]: m.scores[game.winner] + 1 } : m.scores;
      return { ...m, game, scores };
    }
    case 'newGame':
      return fresh(m, false);
    case 'resetScores':
      return fresh(m, true);
    case 'setMode':
      return a.mode === m.mode ? m : fresh(m, true, { mode: a.mode });
    case 'setDifficulty':
      return a.difficulty === m.difficulty ? m : fresh(m, true, { difficulty: a.difficulty });
  }
}
