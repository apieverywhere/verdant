'use client';

import { useEffect, useRef } from 'react';
import { SceneController, type SceneView } from '@/lib/scene/SceneController';

interface Props {
  view: SceneView;
  onPick: (cell: number) => void;
  onUnsupported: () => void;
}

const LABEL = 'A 3×3 board floating in a sunset valley. Drag to rotate, scroll to zoom, click a square to place a piece.';

/** Mounts the three.js scene on a canvas; the scene lives outside React's render cycle. */
export default function BoardScene({ view, onPick, onUnsupported }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<SceneController | null>(null);
  const pickRef = useRef(onPick);
  const viewRef = useRef(view);
  pickRef.current = onPick;
  viewRef.current = view;

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
