/** `/terms`: the terms of service for playing on Verdant. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { adsEnabled } from '@/lib/ads';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service · Verdant',
  description: 'The rules for using Verdant: free browser games, no accounts, fair play.',
};

const UPDATED = '8 November 2026';

export default function TermsPage() {
  return (
    <main className="legal">
      <div className="legal-inner">
        <Link className="back-link" href="/">← Verdant</Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated {UPDATED}</p>

        <p>
          These terms apply when you visit Verdant or play its games. By using the site you agree to them. If you do not
          agree, please do not use the site.
        </p>

        <h2>The service</h2>
        <p>
          Verdant offers free games that run in your web browser. There is nothing to install and no account to create.
          You need a reasonably recent browser; the 3D scenes also need WebGL.
        </p>

        <h2>Who can play</h2>
        <p>
          The games are suitable for all ages. Children should use the site with the knowledge of a parent or guardian,
          who accepts these terms on their behalf.
        </p>

        <h2>Fair use</h2>
        <p>When using Verdant, please do not:</p>
        <ul>
          <li>try to disrupt, overload or break the site, or get around any of its limits;</li>
          <li>copy, scrape or re-publish the site or its games, in whole or in part, as your own;</li>
          <li>use the site for anything unlawful, or to harm other people.</li>
        </ul>

        <h2>Ownership</h2>
        <p>
          The games, their artwork, the Tano character, the Verdant name and logo, and the site’s code and text belong to
          Verdant. You may play the games and share links to them; any other use needs my written permission.
        </p>

        {adsEnabled && (
          <>
            <h2>Advertising</h2>
            <p>
              Verdant is free because it shows ads served by third parties such as Google. I do not control what those
              ads offer, and a purchase you make through an ad is between you and the advertiser. How ads use cookies is
              explained in my <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </>
        )}

        <h2>No warranty</h2>
        <p>
          The site is provided “as is” and “as available”. I work to keep it running and correct, but I do not promise
          that it will always be available, error-free or suited to a particular purpose. Games and features may change or
          be removed at any time.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          As far as the law allows, Verdant is not liable for any indirect or consequential loss, or for any loss of data
          or progress, arising from your use of the site. Nothing in these terms limits rights you have under consumer
          law that cannot be excluded.
        </p>

        <h2>Privacy</h2>
        <p>
          What the site stores and how it is used is described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          I may update these terms; the date at the top shows when they last changed. Continuing to use the site after a
          change means you accept the new terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}
