/** Link-preview card for one game page; each game's `opengraph-image.tsx` re-exports these. */
import { GAME_ART } from '@/components/gameArt';
import { gameById } from './games';
import { OG_ART_SIZE, OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from './ogImage';
import { SITE_NAME } from './site';

export function gameOgImage(id: keyof typeof GAME_ART) {
  const game = gameById(id)!;
  const Art = GAME_ART[id];
  return {
    alt: `${game.name}: ${game.kind}, free on ${SITE_NAME}`,
    size: OG_SIZE,
    contentType: OG_CONTENT_TYPE,
    render: () =>
      renderOgImage({ kicker: `${SITE_NAME} · ${game.scene}`, title: game.name, subtitle: game.kind, art: <Art {...OG_ART_SIZE} />, artBg: game.artBg }),
  };
}
