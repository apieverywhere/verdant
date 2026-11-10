import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';
import './globals.css';

const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-ui',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages set a bare title ("Tidepool – …"); the template adds the site name.
  title: { default: `${SITE_NAME} – ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['free online board games', '3D board games', 'browser games', 'no download', 'play vs computer', '2 player games'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} – ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: `${SITE_NAME} – ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  // Google Search Console "HTML tag" verification; the tag is only rendered when the code is set.
  ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: '#0e2333',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable} data-scroll-behavior="smooth">
      <body>
        {children}
        {/* Vercel Web Analytics (page views) and Speed Insights (Core Web Vitals); no-ops outside Vercel. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
