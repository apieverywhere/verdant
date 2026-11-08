/** The site's public origin for absolute URLs (sitemap.xml, robots.txt). */
import { headers } from 'next/headers';

/**
 * `NEXT_PUBLIC_SITE_URL` when set (e.g. `https://verdant.example`); otherwise the host this request came in on,
 * so the sitemap is right on whatever domain the site is deployed to.
 */
export async function siteUrl(): Promise<string> {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (fixed) return fixed;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
