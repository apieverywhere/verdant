/**
 * Renders the PNG / ICO icons from the logo in `src/app/icon.svg` (re-run after changing the logo):
 *
 *   bun scripts/gen-icons.tsx
 *
 * - src/app/favicon.ico      16/32/48 px, for browsers and crawlers that ask for /favicon.ico
 * - src/app/apple-icon.png   180 px, full-bleed (iOS rounds the corners itself)
 * - public/icon-192.png, public/icon-512.png             rounded, for the web app manifest
 * - public/icon-maskable-512.png                         full-bleed with the mark in the safe zone (Android)
 */
import { writeFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';

const BG = '#ffd27a';
const INK = '#241a3a';

/** The X/O mark on the 34×34 logo grid; `inset` shrinks it toward the centre (maskable icons need a safe zone). */
function Logo({ size, rounded, inset = 0 }: { size: number; rounded: boolean; inset?: number }) {
  const vb = 34 + inset * 2;
  return (
    <svg width={size} height={size} viewBox={`${-inset} ${-inset} ${vb} ${vb}`} fill="none">
      {rounded
        ? <rect x="1" y="1" width="32" height="32" rx="9" fill={BG} />
        : <rect x={-inset} y={-inset} width={vb} height={vb} fill={BG} />}
      <path d="M9 9l7 7M16 9l-7 7" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="22" cy="22" r="4.2" stroke={INK} strokeWidth="2.6" />
    </svg>
  );
}

async function png(size: number, rounded: boolean, inset = 0): Promise<Buffer> {
  const res = new ImageResponse(
    (
      <div style={{ display: 'flex', width: size, height: size }}>
        <Logo size={size} rounded={rounded} inset={inset} />
      </div>
    ),
    { width: size, height: size },
  );
  return Buffer.from(await res.arrayBuffer());
}

/** An ICO file whose entries are PNGs (supported by every current browser). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const favicon = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size, true) })));
await writeFile('src/app/favicon.ico', ico(favicon));
await writeFile('src/app/apple-icon.png', await png(180, false, 3));
await writeFile('public/icon-192.png', await png(192, true));
await writeFile('public/icon-512.png', await png(512, true));
// Android masks to a circle of 80% diameter; 5 units of padding on the 34-unit grid keeps the mark inside it.
await writeFile('public/icon-maskable-512.png', await png(512, false, 5));
console.log('icons written');
