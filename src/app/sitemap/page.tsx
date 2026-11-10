/** `/sitemap`: every section of Verdant, laid out as in the design's Sitemap artboard. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { GAMES } from '@/lib/games';

export const metadata: Metadata = {
  title: 'Sitemap',
  alternates: { canonical: '/sitemap' },
  description: 'Every section of Verdant in one place.',
};

interface Entry {
  label: string;
  href: string;
}

interface Group {
  title: string;
  accent: string;
  /** A group whose heading is itself the link (Home). */
  href?: string;
  links?: Entry[];
}

/** Only pages that exist; add an entry here when a new page ships. */
const GROUPS: Group[] = [
  { title: 'Home', accent: '#4fd8cc', href: '/' },
  { title: 'Games', accent: '#ff7a6b', links: GAMES.map((g) => ({ label: g.name, href: g.href })) },
  {
    title: 'Legal',
    accent: '#6fae5a',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="lobby sitemap-page">
      <SiteHeader />
      <main className="sitemap">
        <div className="sitemap-intro">
          <h1>Sitemap</h1>
          <p>Every section of Verdant in one place.</p>
        </div>
        <div className="sitemap-grid">
          {GROUPS.map((g) => (
            <section key={g.title} className="sitemap-card" aria-labelledby={`sm-${g.title}`}>
              <span className="sitemap-accent" style={{ background: g.accent }} aria-hidden="true" />
              <h2 id={`sm-${g.title}`}>{g.href ? <Link className="sitemap-head" href={g.href}>{g.title}</Link> : g.title}</h2>
              {g.links && (
                <ul>
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <Link className="sitemap-link" href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
