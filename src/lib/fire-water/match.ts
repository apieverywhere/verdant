/** Match-level state for Ember & Tide (scores, mode, difficulty, starter) as a pure reducer. */
import { nextStarter, type Scores } from '../game/match';
import type { Difficulty, Mode, Player } from '../game/types';
import { aiPlayer } from './ai';
import { applyMove, createGame, type FireWaterState } from './rules';

export interface FireWaterMatch {
  game: FireWaterState;
  mode: Mode;
  difficulty: Difficulty;
  scores: Scores;
  starter: Player;
  /** Increments on every new board so the scene can clear without animations. */
  gameId: number;
}

export type FireWaterAction =
  | { type: 'play'; col: number; source: 'human' | 'ai' }
  | { type: 'newGame' }
  | { type: 'resetScores' }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setDifficulty'; difficulty: Difficulty };

const ZERO: Scores = { X: 0, O: 0, D: 0 };

export function initialMatch(mode: Mode = 'pvp', difficulty: Difficulty = 'hard'): FireWaterMatch {
  return { game: createGame('X'), mode, difficulty, scores: ZERO, starter: 'X', gameId: 0 };
}

export const isAiTurn = (m: FireWaterMatch) => m.mode === 'ai' && !m.game.winner && m.game.turn === aiPlayer;

/** Fresh board; Fire starts again when scores are cleared, otherwise the loser of the last round starts (F2.2). */
function fresh(m: FireWaterMatch, clearScores: boolean, patch: Partial<FireWaterMatch> = {}): FireWaterMatch {
  const starter: Player = clearScores ? 'X' : nextStarter(m.starter, m.game.winner);
  return { ...m, ...patch, game: createGame(starter), starter, scores: clearScores ? ZERO : m.scores, gameId: m.gameId + 1 };
}

export function matchReducer(m: FireWaterMatch, a: FireWaterAction): FireWaterMatch {
  switch (a.type) {
    case 'play': {
      if ((a.source === 'ai') !== isAiTurn(m)) return m;
      const game = applyMove(m.game, a.col);
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
