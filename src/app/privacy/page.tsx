/** `/privacy`: the privacy policy AdSense requires, including the third-party cookie disclosure. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { CookieSettingsLink } from '@/components/Ads';
import { adsEnabled } from '@/lib/ads';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy · Verdant',
  description: 'What Verdant stores, which cookies its advertising partners use, and how to opt out.',
};

const UPDATED = '8 November 2026';

export default function PrivacyPage() {
  return (
    <main className="legal">
      <div className="legal-inner">
        <Link className="back-link" href="/">← Verdant</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated {UPDATED}</p>

        <h2>The short version</h2>
        <p>
          Verdant has no accounts and no sign-up. I do not ask for your name, email or any other personal details, and
          the games run entirely in your browser.
        </p>

        <h2>What the site stores on your device</h2>
        <p>
          Your browser’s local storage keeps the name of the game you played last, so the Play button can take you back
          to it. It never leaves your device and you can clear it at any time from your browser settings. Scores live
          only in the open page and are gone when you close it.
        </p>

        <h2>Visit statistics</h2>
        <p>
          To see which pages are visited and how fast they load, the site uses Vercel Web Analytics and Speed Insights.
          They use no cookies and do not identify you: they count page views and measure loading speed, together with
          general details such as country, browser and device type.
        </p>

        {adsEnabled && (
          <>
            <h2>Advertising and cookies</h2>
            <p>
              Verdant is free because it shows ads served by Google. Google and its partners use cookies and similar
              technologies to show ads, to limit how often you see them, to measure them and, where you allow it, to
              personalise them based on your visits to this and other websites.
            </p>
            <ul>
              <li>
                How Google uses this information:{' '}
                <a href="https://policies.google.com/technologies/partner-sites" rel="noopener" target="_blank">
                  policies.google.com/technologies/partner-sites
                </a>
              </li>
              <li>
                Turn personalised ads off with Google:{' '}
                <a href="https://myadcenter.google.com/" rel="noopener" target="_blank">My Ad Center</a>, or for many
                other ad companies at{' '}
                <a href="https://www.aboutads.info/choices/" rel="noopener" target="_blank">aboutads.info</a>.
              </li>
              <li>
                In the European Economic Area, the UK and Switzerland I ask for your consent before ads use cookies. You
                can change your choice at any time: <CookieSettingsLink />.
              </li>
            </ul>
          </>
        )}

        <h2>Children</h2>
        <p>
          The games suit all ages. I do not knowingly collect personal information from anyone, including children
          under 13.
        </p>

        <h2>Changes and contact</h2>
        <p>
          If this policy changes I will update the date above. Questions about your data:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}
