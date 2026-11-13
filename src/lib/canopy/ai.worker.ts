/** Runs the Canopy computer player off the main thread, so the Hard search never freezes the 3D scene. */
import type { Difficulty } from '../game/types';
import { chooseTurn } from './ai';
import type { CanopyState } from './rules';
import type { Turn } from './search';

export interface AiRequest {
  id: number;
  state: CanopyState;
  difficulty: Difficulty;
}

export interface AiReply {
  id: number;
  turn: Turn | null;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, difficulty } = e.data;
  self.postMessage({ id, turn: chooseTurn(state, difficulty) } satisfies AiReply);
};
