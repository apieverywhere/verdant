import type { Metadata, Viewport } from 'next';
import CanopyGame from '@/components/CanopyGame';
import JsonLd from '@/components/JsonLd';
import { gameById } from '@/lib/games';
import { gameJsonLd, gameMetadata } from '@/lib/seo';

const game = gameById('canopy')!;

export const metadata: Metadata = gameMetadata(game);

export const viewport: Viewport = { themeColor: '#0e2333' };

export default function Page() {
  return (
    <>
      <JsonLd data={gameJsonLd(game)} />
      <CanopyGame />
    </>
  );
}
