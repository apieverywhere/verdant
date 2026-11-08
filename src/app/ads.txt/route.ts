/** `/ads.txt`: tells ad buyers which AdSense account may sell this site's ad space. 404 until ads are configured. */
import { ADSENSE_CLIENT, adsEnabled } from '@/lib/ads';

export function GET() {
  if (!adsEnabled) return new Response('Not found', { status: 404 });
  const publisher = ADSENSE_CLIENT.replace(/^ca-/, '');
  return new Response(`google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
