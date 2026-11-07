/** Runs the Ember & Tide computer player off the main thread, so a deep search never freezes the 3D scene. */
import type { Difficulty } from '../game/types';
import { chooseColumn } from './ai';
import type { FireWaterState } from './rules';

export interface AiRequest {
  id: number;
  state: FireWaterState;
  difficulty: Difficulty;
}

export interface AiReply {
  id: number;
  col: number;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, difficulty } = e.data;
  self.postMessage({ id, col: chooseColumn(state, difficulty) } satisfies AiReply);
};
