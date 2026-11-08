'use client';

/** AdSense pieces: the site-wide script, a banner slot and the cookie-settings link. All render nothing until configured. */
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { ADS_TEST, ADSENSE_CLIENT, adsEnabled, GAME_BREAKS, openCookieSettings } from '@/lib/ads';

/**
 * The AdSense tag, exactly as AdSense hands it out. It sits in the server-rendered <head> (not injected later)
 * because AdSense's site check reads the raw HTML; `async` keeps it from blocking the page.
 */
export function AdsHeadTag() {
  if (!adsEnabled) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      {...(ADS_TEST ? { 'data-adbreak-test': 'on' } : {})}
    />
  );
}

/** Ad Placement API bootstrap for between-round breaks: queues adBreak/adConfig calls until adsbygoogle is ready. */
export function AdBreakInit() {
  if (!adsEnabled || !GAME_BREAKS) return null;
  return (
    <Script id="adbreak-init" strategy="afterInteractive">
      {`window.adsbygoogle = window.adsbygoogle || [];
window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
window.adConfig({ preloadAdBreaks: 'on', sound: 'off' });`}
    </Script>
  );
}

/** A responsive banner. Space is reserved up front so the page does not jump when the ad arrives. */
export function AdSlot({ slot, label = 'Advertisement' }: { slot: string; label?: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!adsEnabled || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Blocked by an ad blocker: leave the reserved space empty.
    }
  }, [slot]);

  if (!adsEnabled || !slot) return null;
  return (
    <aside className="ad-slot" aria-label={label}>
      <span className="ad-label">{label}</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(ADS_TEST ? { 'data-adtest': 'on' } : {})}
      />
    </aside>
  );
}

/** “Cookie settings” link; only exists when ads (and so cookies) are on. */
export function CookieSettingsLink() {
  if (!adsEnabled) return null;
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        openCookieSettings();
      }}
    >
      Cookie settings
    </a>
  );
}
