/** Link-preview image for the home page (and any page without its own). */
import { SunsetArt } from '@/components/gameArt';
import { OG_ART_SIZE, OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/ogImage';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    kicker: SITE_NAME,
    title: 'Classic games. Breathtaking worlds.',
    subtitle: 'Free 3D board games. No install.',
    art: <SunsetArt {...OG_ART_SIZE} />,
    artBg: '#2f5f80',
  });
}
