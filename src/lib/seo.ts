/** Metadata and schema.org data shared by the game pages, so every game is described the same way. */
import type { Metadata } from 'next';
import type { Game } from './games';
import { SITE_NAME, SITE_URL } from './site';

/** `<head>` metadata for a game page; the share image comes from the route's `opengraph-image.tsx`. */
export function gameMetadata(game: Game): Metadata {
  const title = `${game.name} – ${game.kind}`;
  return {
    title,
    description: game.description,
    alternates: { canonical: game.href },
    openGraph: { type: 'website', siteName: SITE_NAME, url: game.href, title, description: game.description },
    twitter: { card: 'summary_large_image', title, description: game.description },
  };
}

/** schema.org `VideoGame` for a game page. */
export function gameJsonLd(game: Game) {
  const url = `${SITE_URL}${game.href}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.name,
    alternateName: `${game.name}: ${game.scene}`,
    description: game.description,
    url,
    image: `${url}/opengraph-image`,
    genre: game.genre,
    gamePlatform: 'Web browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2 },
    isAccessibleForFree: true,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };
}
