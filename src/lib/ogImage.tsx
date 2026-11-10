/** The 1200×630 link-preview card shared by every `opengraph-image.tsx`: scene art on the right, title on the left. */
import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';
import { SITE_NAME } from './site';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';
/** The card art's 300×170 viewBox scaled to cover the image width; the extra height is cropped. */
export const OG_ART_SIZE = { width: 1200, height: 680 };

interface Card {
  kicker: string;
  title: string;
  subtitle: string;
  /** Scene art, already sized to cover 1200×630 (see `OG_ART_SIZE`). */
  art: ReactNode;
  artBg: string;
}

export function renderOgImage({ kicker, title, subtitle, art, artBg }: Card) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: artBg }}>
        {/* Scene art fills the card; the 300×170 viewBox is sliced to cover. */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, display: 'flex', overflow: 'hidden' }}>
          {art}
        </div>
        {/* Dark wash on the left so the text stays readable over any scene. */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: 1200, height: 630, display: 'flex',
            backgroundImage: 'linear-gradient(90deg, rgba(8,20,32,0.94) 0%, rgba(8,20,32,0.82) 42%, rgba(8,20,32,0.15) 75%, rgba(8,20,32,0) 100%)',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 72px', width: 760, color: '#f4efe6' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, color: '#ffd27a', marginBottom: 28 }}>
            <svg width="44" height="44" viewBox="0 0 34 34" fill="none" style={{ marginRight: 16 }}>
              <rect x="1" y="1" width="32" height="32" rx="9" fill="#ffd27a" />
              <path d="M9 9l7 7M16 9l-7 7" stroke="#241a3a" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="22" cy="22" r="4.2" stroke="#241a3a" strokeWidth="2.6" />
            </svg>
            {kicker}
          </div>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
          <div style={{ display: 'flex', fontSize: 34, lineHeight: 1.35, marginTop: 24, color: '#c9d8e3' }}>{subtitle}</div>
          <div style={{ display: 'flex', marginTop: 44, fontSize: 26, fontWeight: 700 }}>
            <div style={{ display: 'flex', padding: '12px 26px', borderRadius: 999, background: '#ffd27a', color: '#241a3a' }}>
              Play free in your browser
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}

