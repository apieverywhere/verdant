'use client';

import { useEffect, useRef } from 'react';
import { FireWaterController, type FireWaterView } from '@/lib/scene/FireWaterController';

interface Props {
  view: FireWaterView;
  onPick: (col: number) => void;
  onUnsupported: () => void;
  /** Called once the scene is built and has drawn its first frame. */
  onReady?: () => void;
}

const LABEL = 'A 5×5 board on a snow island in a moonlit ice lake, between fire braziers and crystal lamps, where disc pieces drop in and stack. Drag to rotate, scroll to zoom, click a square to drop a piece.';

/** Mounts the three.js scene on a canvas; the scene lives outside React's render cycle. */
export default function FireWaterScene({ view, onPick, onUnsupported, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<FireWaterController | null>(null);
  const pickRef = useRef(onPick);
  const viewRef = useRef(view);
  pickRef.current = onPick;
  viewRef.current = view;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctrl: FireWaterController;
    try {
      ctrl = new FireWaterController(canvas, (col) => pickRef.current(col));
    } catch (err) {
      console.error('[fire-water] WebGL unavailable', err);
      onUnsupported();
      return;
    }
    ctrl.setView(viewRef.current);
    ctrlRef.current = ctrl;
    readyRef.current?.();
    // Exposed for end-to-end tests (projecting columns to screen coordinates).
    (window as unknown as { __fireWaterScene?: FireWaterController }).__fireWaterScene = ctrl;
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
