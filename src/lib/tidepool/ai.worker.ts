/** Runs the Tidepool computer player off the main thread, so the Hard search never freezes the 3D scene. */
import type { Difficulty } from '../game/types';
import { chooseMove } from './ai';
import type { Move, TidepoolState } from './rules';

export interface AiRequest {
  id: number;
  state: TidepoolState;
  difficulty: Difficulty;
}

export interface AiReply {
  id: number;
  move: Move | null;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, difficulty } = e.data;
  self.postMessage({ id, move: chooseMove(state, difficulty) } satisfies AiReply);
};
