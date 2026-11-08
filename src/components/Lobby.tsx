/** Game lobby (`/`): header, hero, game grid, call-to-action band and footer. Static, so it stays a Server Component. */
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import tano from '@/assets/tano.png';
import { GAMES, type GameId } from '@/lib/games';
import { LOBBY_SLOT } from '@/lib/ads';
import { AdSlot } from './Ads';
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

const SunsetArt = () => (
  <svg viewBox="0 0 300 170" preserveAspectRatio="none" aria-hidden="true">
    <circle cx="150" cy="70" r="26" fill="#f4a27c" />
    <path d="M0 100 L50 60 L95 90 L150 45 L205 88 L255 55 L300 85 L300 170 L0 170 Z" fill="#24486a" />
    <rect x="0" y="135" width="300" height="35" fill="#2b5f78" />
    <rect x="112" y="104" width="76" height="40" rx="6" fill="#1f3346" stroke="#d6ad6c" strokeWidth="2" />
    <path d="M126 114l12 12M138 114l-12 12" stroke="#ff6f5e" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="163" cy="124" r="7" fill="none" stroke="#3fd2c6" strokeWidth="3.4" />
  </svg>
);

const MoonArt = () => (
  <svg viewBox="0 0 300 170" preserveAspectRatio="none" aria-hidden="true">
    <circle cx="232" cy="38" r="15" fill="#e8f0ff" />
    <circle cx="40" cy="30" r="1.4" fill="#ffffff" />
    <circle cx="90" cy="18" r="1.2" fill="#ffffff" />
    <circle cx="180" cy="26" r="1.3" fill="#ffffff" />
    <circle cx="270" cy="70" r="1.1" fill="#ffffff" />
    <path d="M0 105 L55 62 L100 92 L160 50 L215 90 L262 66 L300 88 L300 170 L0 170 Z" fill="#2f6385" />
    <path d="M160 50 L176 64 L166 63 L160 70 L153 62 Z" fill="#e9f0fb" />
    <rect x="0" y="140" width="300" height="30" fill="#1d4466" />
    <path d="M118 70 L150 56 L182 70 L182 118 L150 132 L118 118 Z" fill="none" stroke="#d6ad6c" strokeWidth="2" />
    <path d="M118 70 L150 84 L182 70 M150 84 L150 132" fill="none" stroke="#d6ad6c" strokeWidth="1.4" opacity="0.7" />
    <path d="M128 88l8 8M136 88l-8 8" stroke="#ff6f5e" strokeWidth="3" strokeLinecap="round" />
    <circle cx="164" cy="100" r="5.5" fill="none" stroke="#3fd2c6" strokeWidth="3" />
    <path d="M140 108l8 8M148 108l-8 8" stroke="#ff6f5e" strokeWidth="3" strokeLinecap="round" />
    <circle cx="160" cy="74" r="5" fill="none" stroke="#3fd2c6" strokeWidth="3" />
  </svg>
);

const CARDS: Record<GameId, { description: string; tags: string[]; art: ReactNode; artBg: string }> = {
  'lantern-line': {
    description: 'Line up 3 in a row on a board floating in a sunset valley. Rotate the scene freely.',
    tags: ['3D', '2 players', 'vs Computer'],
    art: <SunsetArt />,
    artBg: '#2f5f80',
  },
  'ember-and-tide': {
    description: 'Fire vs Water on a 5×5 board: pieces drop in and stack up to 5 high. Connect 4 in any direction to win.',
    tags: ['3D', '2 players', 'vs Computer', 'Hard'],
    art: <MoonArt />,
    artBg: '#0f2550',
  },
};


export default function Lobby() {
  return (
    <div className="lobby">
      <SiteHeader home />

      <main>
        <section className="lobby-section hero">
          <div className="hero-copy">
            <p className="hero-kicker">Light games, right in your browser</p>
            <h1>Classic games. Breathtaking worlds.</h1>
            <p className="hero-lead">No install, no account. Open it and play, with a friend beside you or against the computer.</p>
            <div className="hero-actions">
              <PlayRecentLink className="cta cta-lg" named />
              <a className="outline-btn" href="#games">See all games</a>
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
            <h2>All games</h2>
            <p>{GAMES.length} games live · more coming soon</p>
          </div>

          <div className="games-grid">
            {GAMES.map(({ id, name, href }) => {
              const g = CARDS[id];
              return (
                <Link key={id} className="game-card" href={href}>
                  <div className="game-art" style={{ background: g.artBg }}>
                    {g.art}
                    <span className="game-badge">NEW</span>
                  </div>
                  <div className="game-body">
                    <h3>{name}</h3>
                    <p>{g.description}</p>
                    <div className="game-tags">
                      {g.tags.map((t) => <span key={t}>{t}</span>)}
                    </div>
                    <span className="game-play">Play</span>
                  </div>
                </Link>
              );
            })}

            <div id="coming-soon" className="game-soon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c3d6e3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="7" width="18" height="11" rx="4" />
                <path d="M8 11v3M6.5 12.5h3M15 12h.01M17.5 13.5h.01" />
              </svg>
              <h3>More games</h3>
              <p>Coming soon</p>
            </div>
          </div>
        </section>

        <section id="about" className="lobby-section about" aria-labelledby="about-title">
          <h2 id="about-title">Verdant</h2>
          <div className="about-copy">
            <p>
              Verdant is a small collection of relaxing games for students, university students and office workers: a
              place to unwind with friends after hours of classes, exams or meetings. Every round takes just a few
              minutes, so it fits into a lunch break, the gap between lectures or the end of a long day.
            </p>
            <p>
              The games open straight in your browser, on a laptop or a phone. There is nothing to install, no account
              to create and nothing to pay. Sit next to a friend and take turns on the same screen, or play against the
              computer on Dễ, Trung bình or Khó when you are on your own.
            </p>
            <p>
              I build Verdant on my own and add new games over time. If you have an idea, feedback or just want to say
              hello, my social links are at the bottom of the page.
            </p>
          </div>
        </section>

        <div className="lobby-section">
          <AdSlot slot={LOBBY_SLOT} />
        </div>
      </main>

      <section className="lobby-cta" aria-labelledby="cta-title">
        <div className="lobby-cta-inner">
          <div className="lobby-cta-copy">
            <h2 id="cta-title">Interested in working with me?</h2>
            <a className="cta-white" href="#">Connect now</a>
          </div>
          <div className="lobby-cta-art">
            <Image src={tano} alt="Tano the whale guardian waving hello and holding his lantern staff" sizes="295px" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
