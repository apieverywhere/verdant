/** Site-wide facts: name, public origin, and the contact shown on the legal pages. */

export const SITE_NAME = 'Verdant';

/** Short pitch used in the home page title and the shared link card. */
export const SITE_TAGLINE = 'Free 3D Board Games in Your Browser';

export const SITE_DESCRIPTION =
  'Classic board games in breathtaking 3D worlds. Free, no install, no account: open it and play, with a friend or against the computer.';

/**
 * The canonical public origin, without a trailing slash. `NEXT_PUBLIC_SITE_URL` wins (set it when a custom domain is
 * added); otherwise Vercel's production domain, so preview deployments still point canonicals at production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  'https://verdantverse.vercel.app'
).replace(/\/+$/, '');

/** When the privacy policy and terms last changed (YYYY-MM-DD); shown on both pages and used as their sitemap `lastmod`. */
export const LEGAL_UPDATED = '2026-11-08';

/** "8 November 2026" for a YYYY-MM-DD date. */
export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Where people write about the site, their data or these terms. */
export const CONTACT_EMAIL = 'tranantien12@gmail.com';
