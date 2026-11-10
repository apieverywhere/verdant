/** Link-preview image for /tidepool. */
import { gameOgImage } from '@/lib/gameOgImage';

const og = gameOgImage('tidepool');

export const alt = og.alt;
export const size = og.size;
export const contentType = og.contentType;
export default og.render;
