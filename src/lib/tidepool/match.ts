/** Match-level state for Tidepool (selection, wins, mode, difficulty, starter) as a pure reducer. */
import type { Difficulty, Mode, Player } from '../game/types';
import { aiPlayer } from './ai';
import { applyMove, createGame, lineOf, other, type Move, type TidepoolState } from './rules';

export interface TidepoolMatch {
  game: TidepoolState;
  mode: Mode;
  difficulty: Difficulty;
  /** Rounds won by each side. */
  wins: Record<Player, number>;
  /** Marbles the side to move has selected, in click order. */
  sel: number[];
  starter: Player;
  /** Increments on every new board so the scene resets without animations. */
  gameId: number;
}

export type TidepoolAction =
  | { type: 'select'; cell: number }
  | { type: 'clearSelection' }
  | { type: 'move'; move: Move; source: 'human' | 'ai' }
  | { type: 'newGame' }
  | { type: 'resetScores' }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setDifficulty'; difficulty: Difficulty };

const ZERO = { X: 0, O: 0 };

export function initialMatch(mode: Mode = 'pvp', difficulty: Difficulty = 'hard'): TidepoolMatch {
  return { game: createGame('X'), mode, difficulty, wins: ZERO, sel: [], starter: 'X', gameId: 0 };
}

export const isAiTurn = (m: TidepoolMatch) => m.mode === 'ai' && !m.game.winner && m.game.turn === aiPlayer;
const humanTurn = (m: TidepoolMatch) => !m.game.winner && !isAiTurn(m);

/** New board. Starters alternate from round to round; clearing the scores (or changing mode or difficulty) restarts with Pearl. */
function fresh(m: TidepoolMatch, clearScores: boolean, patch: Partial<TidepoolMatch> = {}): TidepoolMatch {
  const starter: Player = clearScores ? 'X' : other(m.starter);
  return { ...m, ...patch, game: createGame(starter), starter, sel: [], wins: clearScores ? ZERO : m.wins, gameId: m.gameId + 1 };
}

export function matchReducer(m: TidepoolMatch, a: TidepoolAction): TidepoolMatch {
  switch (a.type) {
    case 'select': {
      if (!humanTurn(m)) return m;
      // Clicking anything but your own marble clears the selection.
      if (m.game.board[a.cell] !== m.game.turn) return m.sel.length ? { ...m, sel: [] } : m;
      let sel: number[];
      if (m.sel.includes(a.cell)) {
        const rest = m.sel.filter((c) => c !== a.cell);
        sel = lineOf(rest) ? rest : [];
      } else {
        const next = [...m.sel, a.cell];
        sel = lineOf(next) ? next : [a.cell];
      }
      return { ...m, sel };
    }
    case 'clearSelection':
      return m.sel.length ? { ...m, sel: [] } : m;
    case 'move': {
      if ((a.source === 'ai') !== isAiTurn(m)) return m;
      const game = applyMove(m.game, a.move);
      if (game === m.game) return m;
      const wins = game.winner ? { ...m.wins, [game.winner]: m.wins[game.winner] + 1 } : m.wins;
      return { ...m, game, wins, sel: [] };
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
