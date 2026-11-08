/** `/robots.txt`: everything may be crawled; points crawlers at the sitemap. */
import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteUrl();
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  };
}
