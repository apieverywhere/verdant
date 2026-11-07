import type { Metadata, Viewport } from 'next';
import FireWaterGame from '@/components/FireWaterGame';

export const metadata: Metadata = {
  title: 'Ember & Tide – Moonlit Ice Lake',
  description: 'Fire vs Water on a 5×5 board: pieces drop in and stack up to 5 high. Connect 4 in any direction to win.',
};

export const viewport: Viewport = { themeColor: '#0e2333' };

export default function Page() {
  return <FireWaterGame />;
}
