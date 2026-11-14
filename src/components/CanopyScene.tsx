'use client';

import { useEffect, useRef } from 'react';
import { CanopyController, type CanopyView } from '@/lib/scene/CanopyController';

interface Props {
  view: CanopyView;
  /** Tile that was clicked, −1 for a click off the board. */
  onPick: (cell: number) => void;
  onUnsupported: () => void;
  /** Called once the scene is built and has drawn its first frame. */
  onReady?: () => void;
}

const LABEL =
  'A 5 by 5 Canopy board of mossy tiles in a forest clearing at dawn. Tiles grow into saplings, young trees, treetops and blossoms, and can be cut back; Amber and Violet climbers stand on them. Drag to rotate, scroll to zoom, click a climber and then a marker to play.';

/** Mounts the three.js scene on a canvas; the scene lives outside React's render cycle. */
export default function CanopyScene({ view, onPick, onUnsupported, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<CanopyController | null>(null);
  const pickRef = useRef(onPick);
  const viewRef = useRef(view);
  pickRef.current = onPick;
  viewRef.current = view;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctrl: CanopyController;
    try {
      ctrl = new CanopyController(canvas, (cell) => pickRef.current(cell));
    } catch (err) {
      console.error('[canopy] WebGL unavailable', err);
      onUnsupported();
      return;
    }
    ctrl.setView(viewRef.current);
    ctrlRef.current = ctrl;
    readyRef.current?.();
    // Exposed for end-to-end tests (projecting tiles to screen coordinates).
    (window as unknown as { __canopyScene?: CanopyController }).__canopyScene = ctrl;
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
