'use client';

import { useEffect, useRef } from 'react';
import { TidepoolController, type TidepoolPick, type TidepoolView } from '@/lib/scene/TidepoolController';

interface Props {
  view: TidepoolView;
  onPick: (hit: TidepoolPick) => void;
  onUnsupported: () => void;
}

const LABEL =
  'A hexagonal Tidepool board on a stone platform in a lagoon at dusk, with Pearl and Coral marbles. Drag to rotate, scroll to zoom, click marbles to select them and click a gold marker to move.';

/** Mounts the three.js scene on a canvas; the scene lives outside React's render cycle. */
export default function TidepoolScene({ view, onPick, onUnsupported }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<TidepoolController | null>(null);
  const pickRef = useRef(onPick);
  const viewRef = useRef(view);
  pickRef.current = onPick;
  viewRef.current = view;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctrl: TidepoolController;
    try {
      ctrl = new TidepoolController(canvas, (hit) => pickRef.current(hit));
    } catch (err) {
      console.error('[tidepool] WebGL unavailable', err);
      onUnsupported();
      return;
    }
    ctrl.setView(viewRef.current);
    ctrlRef.current = ctrl;
    // Exposed for end-to-end tests (projecting holes and markers to screen coordinates).
    (window as unknown as { __tidepoolScene?: TidepoolController }).__tidepoolScene = ctrl;
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
