/**
 * Google AdSense settings, read from build-time env vars (see `.env.example`). With no publisher id set, the site
 * loads no ad code at all and every ad component renders nothing.
 */

/** Publisher id, e.g. `ca-pub-1234567890123456`. */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || '';

/** Ad unit (slot) id of the lobby banner, created under AdSense → Ads → By ad unit. */
export const LOBBY_SLOT = process.env.NEXT_PUBLIC_ADSENSE_LOBBY_SLOT?.trim() || '';

/** Between-rounds ads through the Ad Placement API ("H5 Games Ads"); needs separate approval in AdSense. */
export const GAME_BREAKS = process.env.NEXT_PUBLIC_ADSENSE_GAME_BREAKS === 'on';

/** Ask Google for test ads (no real impressions) while developing. */
export const ADS_TEST = process.env.NEXT_PUBLIC_ADSENSE_TEST === 'on';

export const adsEnabled = /^ca-pub-\d{10,20}$/.test(ADSENSE_CLIENT);

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (options: Record<string, unknown>) => void;
    googlefc?: { callbackQueue?: unknown[]; showRevocationMessage?: () => void };
  }
}

/**
 * Offers Google a natural break (a round just ended and the player asked for a new one). Fire-and-forget: the
 * game never waits on it, so a blocked or missing ad script cannot stall play. Google decides whether to show one.
 */
export function requestAdBreak(name: string) {
  if (!adsEnabled || !GAME_BREAKS || typeof window === 'undefined' || !window.adBreak) return;
  try {
    window.adBreak({ type: 'next', name });
  } catch {
    // Ads must never break the game.
  }
}

/** Reopens Google's consent message (the certified CMP set up under AdSense → Privacy & messaging). */
export function openCookieSettings() {
  const fc = (window.googlefc ??= {});
  (fc.callbackQueue ??= []).push(() => window.googlefc?.showRevocationMessage?.());
}
