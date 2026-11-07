/** Game lobby (`/`): header, hero, game grid, call-to-action band and footer. Static, so it stays a Server Component. */
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import tano from '@/assets/tano.png';
import { GAMES, type GameId } from '@/lib/games';
import PlayRecentLink from './PlayRecentLink';

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

/** Social and legal destinations are not decided yet: every href is a placeholder to fill in. */
const SOCIAL: { label: string; icon: ReactNode }[] = [
  {
    label: 'YouTube',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true">
        <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.75 15.02V8.98L15.5 12z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'X (Twitter)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-7.5 8.6L23.3 22h-6.9l-5.4-7-6.2 7H1.7l8-9.2L1.3 2h7l4.9 6.4zm-1.2 18h1.9L7.4 4H5.4z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
      </svg>
    ),
  },
];

const LEGAL_LINKS = [
  'Terms of Service',
  'Privacy Policy',
  'Parent’s Guide',
  'Safe and Fair Play Policy',
  'Accessibility Statement',
  'Other Legal Docs',
  'Media Center',
  'Our Domains',
  'Manage Cookies',
];

const Logo = ({ size, bg, fg }: { size: number; bg: string; fg: string }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="32" height="32" rx="9" fill={bg} />
    <path d="M9 9l7 7M16 9l-7 7" stroke={fg} strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="22" cy="22" r="4.2" stroke={fg} strokeWidth="2.6" />
  </svg>
);

export default function Lobby() {
  return (
    <div className="lobby">
      <header className="lobby-header">
        <div className="lobby-bar">
          <Link className="lobby-logo" href="/">
            <Logo size={34} bg="#ffd27a" fg="#241a3a" />
            <span>Verdant</span>
          </Link>
          <nav className="lobby-nav" aria-label="Main navigation">
            <a href="#games">Games</a>
            <a href="#about">About</a>
            <PlayRecentLink className="cta" />
          </nav>
        </div>
      </header>

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

      </main>

      <section id="about" className="lobby-cta" aria-labelledby="cta-title">
        <div className="lobby-cta-inner">
          <div className="lobby-cta-copy">
            <h2 id="cta-title">Interested in working with us?</h2>
            <a className="cta-white" href="#">Connect now</a>
          </div>
          <div className="lobby-cta-art">
            <Image src={tano} alt="Tano the whale guardian waving hello and holding his lantern staff" sizes="295px" />
          </div>
        </div>
      </section>

      <footer className="lobby-footer">
        <div className="lobby-footer-inner">
          <div className="footer-follow">
            <p>Follow us on</p>
            <nav aria-label="Social media" className="footer-social">
              {SOCIAL.map((s) => (
                <a key={s.label} href="#" aria-label={s.label}>{s.icon}</a>
              ))}
            </nav>
          </div>

          <div className="footer-rule" />

          <nav aria-label="Legal and site links" className="footer-links">
            {LEGAL_LINKS.map((label) => <a key={label} href="#">{label}</a>)}
          </nav>

          <div className="footer-bottom">
            <span className="footer-copy">© 2026 Verdant</span>
            <div className="footer-end">
              <a className="footer-sitemap" href="#">Sitemap</a>
              <Link className="footer-brand" href="/" aria-label="Verdant home">
                <Logo size={40} bg="#ffffff" fg="#08192a" />
                <span>Verdant</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
