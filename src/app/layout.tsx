import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-ui',
});

export const metadata: Metadata = {
  title: 'Verdant',
  description: 'Classic games in breathtaking 3D worlds. No install, no account: open it and play, with a friend or against the computer.',
};

export const viewport: Viewport = {
  themeColor: '#0e2333',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
