'use client';

import { useEffect, useRef } from 'react';
import { SceneController, type SceneView } from '@/lib/scene/SceneController';

interface Props {
  view: SceneView;
  onPick: (cell: number) => void;
  onUnsupported: () => void;
  /** Called once the scene is built and has drawn its first frame. */
  onReady?: () => void;
}

const LABEL = 'A 3×3 board on a meadow island in a sunset valley lake, with a glowing stone lantern at each corner. Drag to rotate, scroll to zoom, click a square to place a piece.';

/** Mounts the three.js scene on a canvas; the scene lives outside React's render cycle. */
export default function BoardScene({ view, onPick, onUnsupported, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<SceneController | null>(null);
  const pickRef = useRef(onPick);
  const viewRef = useRef(view);
  pickRef.current = onPick;
  viewRef.current = view;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctrl: SceneController;
    try {
      ctrl = new SceneController(canvas, (i) => pickRef.current(i));
    } catch (err) {
      console.error('[caro] WebGL unavailable', err);
      onUnsupported();
      return;
    }
    ctrl.setView(viewRef.current);
    ctrlRef.current = ctrl;
    readyRef.current?.();
    // Exposed for end-to-end tests (projecting cells to screen coordinates).
    (window as unknown as { __caroScene?: SceneController }).__caroScene = ctrl;
    return () => {
      ctrl.dispose();
      ctrlRef.current = null;
    };
  }, [onUnsupported]);

  useEffect(() => {
    ctrlRef.current?.setView(view);
  }, [view]);

  return <canvas ref={canvasRef} className="scene" role="img" aria-label={LABEL} />;
}
