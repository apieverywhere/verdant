/** Header and footer shared by the lobby and the other site pages (sitemap, privacy). Server Components. */
import Link from 'next/link';
import type { ReactNode } from 'react';
import PlayRecentLink from './PlayRecentLink';

/** The author's social profiles, shown in the footer. */
export const SOCIAL: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/ta.tien2k3',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/supertien12/',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/antienn/',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
      </svg>
    ),
  },
];

/** A free browser game with no accounts only needs its terms and privacy policy. */
const LEGAL_LINKS = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
];

export const Logo = ({ size, bg, fg }: { size: number; bg: string; fg: string }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="32" height="32" rx="9" fill={bg} />
    <path d="M9 9l7 7M16 9l-7 7" stroke={fg} strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="22" cy="22" r="4.2" stroke={fg} strokeWidth="2.6" />
  </svg>
);

/** On the lobby the nav scrolls within the page; elsewhere it goes back to the lobby sections. */
export function SiteHeader({ home = false }: { home?: boolean }) {
  const base = home ? '' : '/';
  return (
    <header className="lobby-header">
      <div className="lobby-bar">
        <Link className="lobby-logo" href="/">
          <Logo size={34} bg="#ffd27a" fg="#241a3a" />
          <span>Verdant</span>
        </Link>
        <nav className="lobby-nav" aria-label="Main navigation">
          <a href={`${base}#games`}>Games</a>
          <a href={`${base}#about`}>About</a>
          <PlayRecentLink className="cta" />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="lobby-footer">
      <div className="lobby-footer-inner">
        <div className="footer-follow">
          <p>Follow me on</p>
          <nav aria-label="Social media" className="footer-social">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="me noopener noreferrer" aria-label={s.label}>{s.icon}</a>
            ))}
          </nav>
        </div>

        <div className="footer-rule" />

        <nav aria-label="Legal and site links" className="footer-links">
          {LEGAL_LINKS.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
        </nav>

        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Verdant</span>
          <div className="footer-end">
            <Link className="footer-sitemap" href="/sitemap">Sitemap</Link>
            <Link className="footer-brand" href="/" aria-label="Verdant home">
              <Logo size={40} bg="#ffffff" fg="#08192a" />
              <span>Verdant</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
