/**
 * Canopy computer player (Violet) at three levels:
 * - Easy: looks at its own turn only, and plays a random turn a third of the time.
 * - Medium: alpha-beta with a small node budget: answers direct threats, makes no deep plans.
 * - Hard: iterative-deepening alpha-beta within a large node budget (`search.ts`).
 */
import type { Difficulty, Player } from '../game/types';
import type { CanopyState } from './rules';
import { greedyTurn, legalTurns, MEDIUM_NODES, searchTurn, type Turn } from './search';

export const aiPlayer: Player = 'O';

const EASY_RANDOM_CHANCE = 0.35;
const EASY_NOISE = 10;

/**
 * The rest of the turn for the side to move, or null when there is none. Parts already on the board are −1:
 * `to` in the grow and cut phases, `grow` in the cut phase. A step that wins outright has `grow` and `cut` −1;
 * `cut` −1 otherwise means "skip cutting".
 */
export function chooseTurn(state: CanopyState, difficulty: Difficulty = 'hard', random: () => number = Math.random): Turn | null {
  if (difficulty === 'hard') return searchTurn(state, random).turn;
  if (difficulty === 'medium') return searchTurn(state, random, MEDIUM_NODES).turn;
  if (random() < EASY_RANDOM_CHANCE) {
    const turns = legalTurns(state);
    return turns.length ? turns[Math.floor(random() * turns.length)] : null;
  }
  return greedyTurn(state, EASY_NOISE, random).turn;
}
