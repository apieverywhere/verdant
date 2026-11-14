import Image from 'next/image';
import tano from '@/assets/tano.png';

/**
 * Shown over the stage while the three.js scene downloads and builds. Tano, the lobby's whale guardian, hates
 * waiting: he trembles, flushes red, blows his top and is left charred and blinking before he pulls himself
 * together and starts again. Everything that moves is an HTML/SVG element animated with transform and opacity
 * only (see globals.css), so it keeps running while the main thread is busy. Fades out once `done` is set.
 */
export default function SceneLoader({ done }: { done: boolean }) {
  const picture = { src: tano, alt: '', sizes: '168px', loading: 'eager' } as const;
  return (
    <div className="loader" data-done={done} role="status" aria-hidden={done}>
      <div className="tano" aria-hidden="true">
        <Image {...picture} />
        <Image {...picture} className="tano-red" />
        <Image {...picture} className="tano-soot" />
        {/* Overlays share the picture's 560×703 pixel grid. Scowling brows while he fumes: tapered wedges in the
            artwork's own ink colour, drawn over (and hiding) his usual gentle ones… */}
        <svg className="tano-brows" viewBox="0 0 560 703">
          <g fill="#141a7a" stroke="#141a7a" strokeWidth="3" strokeLinejoin="round">
            <path d="M144 184 Q 184 177 217 203 L 215 224 Q 180 201 151 202 Z" />
            <path d="M388 225 Q 344 202 300 229 L 302 252 Q 344 226 381 242 Z" />
          </g>
        </svg>
        {/* …and wide white eyes staring out of the soot afterwards. */}
        <svg className="tano-eyes" viewBox="0 0 560 703">
          <g fill="#fff">
            <circle cx="160" cy="274" r="33" />
            <circle cx="338" cy="302" r="33" />
          </g>
          <g fill="#14233f">
            <circle cx="166" cy="278" r="10" />
            <circle cx="332" cy="306" r="10" />
          </g>
          <path d="M214 352 Q 232 338 250 352 T 286 354" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
        </svg>
        <svg className="tano-vein" viewBox="0 0 40 40">
          <g fill="none" stroke="#ff4b3e" strokeWidth="5" strokeLinecap="round">
            <path d="M6 14 Q 14 14 14 6" />
            <path d="M34 14 Q 26 14 26 6" />
            <path d="M6 26 Q 14 26 14 34" />
            <path d="M34 26 Q 26 26 26 34" />
          </g>
        </svg>
        <i className="tano-steam tano-steam-l" />
        <i className="tano-steam tano-steam-r" />
        <svg className="tano-boom" viewBox="0 0 200 200">
          <polygon
            fill="#ffb347"
            points="100,4 118,58 160,22 146,76 196,74 154,106 192,140 140,134 150,188 110,150 84,196 78,142 26,170 52,120 4,104 54,86 26,40 78,62"
          />
          <polygon
            fill="#fff3c4"
            points="100,44 110,76 136,56 128,88 158,88 132,106 154,128 124,124 130,156 106,134 90,160 88,128 56,144 72,114 44,104 74,94 58,66 88,80"
          />
        </svg>
        <i className="tano-smoke" />
        <i className="tano-smoke tano-smoke-b" />
        <i className="tano-smoke tano-smoke-c" />
      </div>
      <p className="loader-text">Loading<span>.</span><span>.</span><span>.</span></p>
    </div>
  );
}
