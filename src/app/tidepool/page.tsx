import type { Metadata, Viewport } from 'next';
import TidepoolGame from '@/components/TidepoolGame';
import JsonLd from '@/components/JsonLd';
import { gameById } from '@/lib/games';
import { gameJsonLd, gameMetadata } from '@/lib/seo';

const game = gameById('tidepool')!;

export const metadata: Metadata = gameMetadata(game);

export const viewport: Viewport = { themeColor: '#0e2333' };

export default function Page() {
  return (
    <>
      <JsonLd data={gameJsonLd(game)} />
      <TidepoolGame />
    </>
  );
}
