/** Link-preview image for /canopy. */
import { gameOgImage } from '@/lib/gameOgImage';

const og = gameOgImage('canopy');

export const alt = og.alt;
export const size = og.size;
export const contentType = og.contentType;
export default og.render;
