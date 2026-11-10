import type { Metadata, Viewport } from 'next';
import FireWaterGame from '@/components/FireWaterGame';
import JsonLd from '@/components/JsonLd';
import { gameById } from '@/lib/games';
import { gameJsonLd, gameMetadata } from '@/lib/seo';

const game = gameById('ember-and-tide')!;

export const metadata: Metadata = gameMetadata(game);

export const viewport: Viewport = { themeColor: '#0e2333' };

export default function Page() {
  return (
    <>
      <JsonLd data={gameJsonLd(game)} />
      <FireWaterGame />
    </>
  );
}
