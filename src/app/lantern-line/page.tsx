import type { Metadata, Viewport } from 'next';
import Game from '@/components/Game';

export const metadata: Metadata = {
  title: 'Lantern Line – Sunset Valley',
  description: 'Vanishing tic-tac-toe: each side keeps only 3 pieces. Play a friend or the computer (minimax + alpha-beta).',
};

export const viewport: Viewport = { themeColor: '#0e2333' };

export default function Page() {
  return <Game />;
}
