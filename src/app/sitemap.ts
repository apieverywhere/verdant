/** `/sitemap.xml` for search engines: every public page. Keep in step with the human sitemap at `/sitemap`. */
import type { MetadataRoute } from 'next';
import { GAMES } from '@/lib/games';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly') => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page('/', 1, 'weekly'),
    ...GAMES.map((g) => page(g.href, 0.9, 'monthly')),
    page('/sitemap', 0.3, 'monthly'),
    page('/privacy', 0.2, 'yearly'),
    page('/terms', 0.2, 'yearly'),
  ];
}
