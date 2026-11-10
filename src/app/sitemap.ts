/** `/sitemap.xml` for search engines: every public page. Keep in step with the human sitemap at `/sitemap`. */
import type { MetadataRoute } from 'next';
import { GAMES } from '@/lib/games';
import { LEGAL_UPDATED, SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, lastModified: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly') => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  // The lobby and the human sitemap list every game, so they change whenever a game does.
  const newestGame = GAMES.map((g) => g.updated).sort().at(-1)!;
  return [
    page('/', newestGame, 1, 'weekly'),
    ...GAMES.map((g) => page(g.href, g.updated, 0.9, 'monthly')),
    page('/sitemap', newestGame, 0.3, 'monthly'),
    page('/privacy', LEGAL_UPDATED, 0.2, 'yearly'),
    page('/terms', LEGAL_UPDATED, 0.2, 'yearly'),
  ];
}
