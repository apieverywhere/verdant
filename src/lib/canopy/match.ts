/** Match-level state for Canopy (selection, wins, mode, difficulty, starter) as a pure reducer. */
import type { Difficulty, Mode, Player } from '../game/types';
import { aiPlayer } from './ai';
import { createGame, cut, grow, other, ownerOf, skipCut, step, type CanopyState } from './rules';

export interface CanopyMatch {
  game: CanopyState;
  mode: Mode;
  difficulty: Difficulty;
  /** Rounds won by each side. */
  wins: Record<Player, number>;
  /** Climber the side to move has picked up, −1 for none. */
  sel: number;
  starter: Player;
  /** Increments on every new board so the scene resets without animations. */
  gameId: number;
}

export type CanopyAction =
  | { type: 'select'; climber: number }
  | { type: 'clearSelection' }
  | { type: 'step'; climber: number; to: number; source: 'human' | 'ai' }
  | { type: 'grow'; cell: number; source: 'human' | 'ai' }
  | { type: 'cut'; cell: number; source: 'human' | 'ai' }
  | { type: 'skipCut'; source: 'human' | 'ai' }
  | { type: 'newGame' }
  | { type: 'resetScores' }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setDifficulty'; difficulty: Difficulty };

const ZERO = { X: 0, O: 0 };

export function initialMatch(mode: Mode = 'pvp', difficulty: Difficulty = 'hard'): CanopyMatch {
  return { game: createGame('X'), mode, difficulty, wins: ZERO, sel: -1, starter: 'X', gameId: 0 };
}

export const isAiTurn = (m: CanopyMatch) => m.mode === 'ai' && !m.game.winner && m.game.turn === aiPlayer;
const humanTurn = (m: CanopyMatch) => !m.game.winner && !isAiTurn(m);

/** New board. Starters alternate from round to round; clearing the scores (or changing mode or difficulty) restarts with Amber. */
function fresh(m: CanopyMatch, clearScores: boolean, patch: Partial<CanopyMatch> = {}): CanopyMatch {
  const starter: Player = clearScores ? 'X' : other(m.starter);
  return { ...m, ...patch, game: createGame(starter), starter, sel: -1, wins: clearScores ? ZERO : m.wins, gameId: m.gameId + 1 };
}

/** Applies a new game state, counting the round when it was just won. */
function advance(m: CanopyMatch, game: CanopyState): CanopyMatch {
  if (game === m.game) return m;
  const wins = game.winner ? { ...m.wins, [game.winner]: m.wins[game.winner] + 1 } : m.wins;
  return { ...m, game, wins, sel: -1 };
}

export function matchReducer(m: CanopyMatch, a: CanopyAction): CanopyMatch {
  switch (a.type) {
    case 'select': {
      // Only before stepping: once a climber has stepped, it is the one that grows and cuts.
      if (!humanTurn(m) || m.game.phase !== 'move') return m;
      const sel = ownerOf(a.climber) === m.game.turn && a.climber !== m.sel ? a.climber : -1;
      return sel === m.sel ? m : { ...m, sel };
    }
    case 'clearSelection':
      return m.sel < 0 ? m : { ...m, sel: -1 };
    case 'step':
      if ((a.source === 'ai') !== isAiTurn(m)) return m;
      return advance(m, step(m.game, a.climber, a.to));
    case 'grow':
      if ((a.source === 'ai') !== isAiTurn(m)) return m;
      return advance(m, grow(m.game, a.cell));
    case 'cut':
      if ((a.source === 'ai') !== isAiTurn(m)) return m;
      return advance(m, cut(m.game, a.cell));
    case 'skipCut':
      if ((a.source === 'ai') !== isAiTurn(m)) return m;
      return advance(m, skipCut(m.game));
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
