/** Ember & Tide computer player. Easy and Medium score every column one ply deep, as the design does; Hard searches. */
import { other } from '../game/rules';
import type { Difficulty, Player } from '../game/types';
import { CELL_LINES, CELLS, COLUMNS, dropCell, LINES, wouldWin, type FireWaterState } from './rules';
import { searchColumn } from './search';

export const aiPlayer: Player = 'O';

const EASY_RANDOM_CHANCE = 0.35;
const WIN = 1e9;
const BLOCK = 1e8;
/** Playing here hands the opponent a win on the cell above. */
const GIFT_PENALTY = 5e7;
/** Playing here spoils our own win on the cell above, since the opponent will just take that cell. */
const SPOIL_PENALTY = 300;
const TIEBREAK = 6;

/** Value of a line through the candidate cell, from the counts of pieces already on it. */
function lineScore(mine: number, theirs: number): number {
  if (mine && theirs) return 0; // dead line
  if (mine === 2) return 700;
  if (theirs === 2) return 420;
  if (mine === 1) return 30;
  if (theirs === 1) return 18;
  return 2;
}

function bestByScore(state: FireWaterState, lookAbove: boolean, random: () => number): number {
  const me = state.turn, foe = other(me), board = state.board.slice();
  let best = -1, bestScore = -Infinity;
  for (let col = 0; col < COLUMNS; col++) {
    const cell = dropCell(board, col);
    if (cell < 0) continue;
    let score = wouldWin(board, cell, me) ? WIN : wouldWin(board, cell, foe) ? BLOCK : 0;
    for (const id of CELL_LINES[cell]) {
      const line = LINES[id];
      score += lineScore(line.filter((c) => board[c] === me).length, line.filter((c) => board[c] === foe).length);
    }
    const above = cell + COLUMNS;
    if (lookAbove && above < CELLS && score < BLOCK) {
      board[cell] = me;
      if (wouldWin(board, above, foe)) score -= GIFT_PENALTY;
      else if (wouldWin(board, above, me)) score -= SPOIL_PENALTY;
      board[cell] = null;
    }
    score += random() * TIEBREAK;
    if (score > bestScore) {
      bestScore = score;
      best = col;
    }
  }
  return best;
}

/** Best column for the player to move, or −1 when no move exists. */
export function chooseColumn(state: FireWaterState, difficulty: Difficulty = 'hard', random: () => number = Math.random): number {
  if (difficulty === 'hard') return searchColumn(state, random);
  if (difficulty === 'medium') return bestByScore(state, true, random);
  if (random() < EASY_RANDOM_CHANCE) {
    const legal: number[] = [];
    for (let col = 0; col < COLUMNS; col++) if (dropCell(state.board, col) >= 0) legal.push(col);
    return legal.length ? legal[Math.floor(random() * legal.length)] : -1;
  }
  return bestByScore(state, false, random);
}
