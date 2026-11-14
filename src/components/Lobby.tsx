'use client';

/**
 * Game lobby (`/`): header, hero, game grid, call-to-action band and footer. A Client Component so its text follows
 * the chosen language; it is still prerendered (in English) for the first paint and for search engines.
 */
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import tano from '@/assets/tano.png';
import { GAMES, type GameId } from '@/lib/games';
import { useT, type Dict } from '@/lib/i18n';
import { ForestArt, LagoonArt, MoonArt, SunsetArt } from './gameArt';
import PlayRecentLink from './PlayRecentLink';
import { SiteFooter, SiteHeader } from './SiteChrome';

const XMark = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ff6f5e" strokeWidth="3.6" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);
const OMark = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2fb8ad" strokeWidth="3.6" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
  </svg>
);

const HERO_BOARD = ['X', null, 'O', null, 'X', null, 'O', null, 'X'] as const;

type Tag = keyof Dict['tags'];

const CARDS: Record<GameId, { tags: Tag[]; art: ReactNode; artBg: string }> = {
  'lantern-line': {
    tags: ['3d', 'pvp', 'ai'],
    art: <SunsetArt />,
    artBg: '#2f5f80',
  },
  'ember-and-tide': {
    tags: ['3d', 'pvp', 'ai', 'hard'],
    art: <MoonArt />,
    artBg: '#0f2550',
  },
  tidepool: {
    tags: ['3d', 'pvp', 'ai', 'strategy'],
    art: <LagoonArt />,
    artBg: '#2f6f8f',
  },
  canopy: {
    tags: ['3d', 'pvp', 'ai', 'strategy'],
    art: <ForestArt />,
    artBg: '#3f7a6a',
  },
};


export default function Lobby() {
  const t = useT();
  return (
    <div className="lobby">
      <SiteHeader home />

      <main>
        <section className="lobby-section hero">
          <div className="hero-copy">
            <p className="hero-kicker">{t.heroKicker}</p>
            <h1>{t.heroTitle}</h1>
            <p className="hero-lead">{t.heroLead}</p>
            <div className="hero-actions">
              <PlayRecentLink className="cta cta-lg" named />
              <a className="outline-btn" href="#games">{t.seeAllGames}</a>
            </div>
          </div>

          <div className="hero-art">
            <div className="hero-sun" />
            <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 120 L70 60 L130 100 L200 30 L270 95 L330 55 L400 110 L470 40 L540 90 L600 70 L600 220 L0 220 Z" fill="#2f5f80" />
              <path d="M200 30 L222 52 L210 50 L200 58 L190 48 Z M470 40 L490 60 L478 58 L470 66 L460 56 Z" fill="#ece5f1" />
              <path d="M0 160 L90 120 L170 150 L260 110 L350 150 L440 125 L520 155 L600 135 L600 220 L0 220 Z" fill="#24486a" />
              <rect x="0" y="182" width="600" height="38" fill="#2b5f78" />
            </svg>
            <div className="hero-board">
              {HERO_BOARD.map((c, i) => (
                <div key={i}>{c === 'X' ? <XMark /> : c === 'O' ? <OMark /> : null}</div>
              ))}
            </div>
          </div>
        </section>

        <section id="games" className="lobby-section games">
          <div className="games-head">
            <h2>{t.allGames}</h2>
            <p>{t.gamesLive(GAMES.length)}</p>
          </div>

          <div className="games-grid">
            {GAMES.map(({ id, name, href }) => {
              const g = CARDS[id];
              return (
                <Link key={id} className="game-card" href={href}>
                  <div className="game-art" style={{ background: g.artBg }}>
                    {g.art}
                    <span className="game-badge">{t.badgeNew}</span>
                  </div>
                  <div className="game-body">
                    <h3>{name}</h3>
                    <p>{t.cards[id]}</p>
                    <div className="game-tags">
                      {g.tags.map((tag) => <span key={tag}>{t.tags[tag]}</span>)}
                    </div>
                    <span className="game-play">{t.play}</span>
                  </div>
                </Link>
              );
            })}

            <div id="coming-soon" className="game-soon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c3d6e3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="7" width="18" height="11" rx="4" />
                <path d="M8 11v3M6.5 12.5h3M15 12h.01M17.5 13.5h.01" />
              </svg>
              <h3>{t.moreGames}</h3>
              <p>{t.comingSoon}</p>
            </div>
          </div>
        </section>

        <section id="about" className="lobby-section about" aria-labelledby="about-title">
          <h2 id="about-title">Verdant</h2>
          <div className="about-copy">
            {t.about.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
        </section>

      </main>

      <section className="lobby-cta" aria-labelledby="cta-title">
        <div className="lobby-cta-inner">
          <div className="lobby-cta-copy">
            <h2 id="cta-title">{t.ctaTitle}</h2>
            <a className="cta-white" href="#">{t.ctaButton}</a>
          </div>
          <div className="lobby-cta-art">
            <Image src={tano} alt={t.tanoAlt} sizes="295px" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
