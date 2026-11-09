import type { Metadata, Viewport } from 'next';
import TidepoolGame from '@/components/TidepoolGame';

export const metadata: Metadata = {
  title: 'Tidepool – Lagoon at Dusk',
  description: "Pearl vs Coral on a hexagonal board in a lagoon. Push lines of marbles and knock 6 of your opponent's into the sea.",
};

export const viewport: Viewport = { themeColor: '#0e2333' };

export default function Page() {
  return <TidepoolGame />;
}
