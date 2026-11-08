import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { AdBreakInit, AdsHeadTag } from '@/components/Ads';
import './globals.css';

const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-ui',
});

export const metadata: Metadata = {
  title: 'Verdant',
  description: 'Classic games in breathtaking 3D worlds. No install, no account: open it and play, with a friend or against the computer.',
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
      <head>
        <AdsHeadTag />
      </head>
      <body>
        {children}
        <AdBreakInit />
      </body>
    </html>
  );
}
