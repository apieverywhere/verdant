/** `/privacy`: the privacy policy. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
  description: 'What Verdant stores and which statistics it collects.',
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
