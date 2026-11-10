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

/** Where people write about the site, their data or these terms. */
export const CONTACT_EMAIL = 'tranantien12@gmail.com';
