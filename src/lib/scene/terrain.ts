/** Procedural helpers ported from the design: seeded RNG, value noise, fbm and the valley height field. */

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = ReturnType<typeof rng>;

export function hash2(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x: number, z: number) {
  let v = 0, a = 0.5, f = 1;
  for (let o = 0; o < 5; o++) {
    v += a * vnoise(x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v / 0.97;
}

function sstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Direction towards the low sun, shared by the sky shader and the terrain (mountains open towards it). */
export const SUN_SKY: [number, number, number] = (() => {
  const v = [-0.55, 0.07, -0.83], l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const SUN_XZ = (() => {
  const l = Math.hypot(SUN_SKY[0], SUN_SKY[2]);
  return [SUN_SKY[0] / l, SUN_SKY[2] / l];
})();

/** Direction towards the moon of the ice lake; its mountains open towards it the same way. */
export const MOON_SKY: [number, number, number] = (() => {
  const v = [0.52, 0.3, -0.8], l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const MOON_XZ = (() => {
  const l = Math.hypot(MOON_SKY[0], MOON_SKY[2]);
  return [MOON_SKY[0] / l, MOON_SKY[2] / l];
})();

export function moonTerrainH(x: number, z: number) {
  const r = Math.hypot(x, z);
  let h = -4 + sstep(19, 34, r) * (6 + 5 * fbm(x * 0.07 + 31, z * 0.07 + 2));
  const toward = r > 0.001 ? (x * MOON_XZ[0] + z * MOON_XZ[1]) / r : 0;
  const low = 1 - 0.55 * sstep(0.3, 0.95, toward);
  const m = fbm(x * 0.024 + 13, z * 0.024 + 1);
  const ridge = 1 - Math.abs(2 * vnoise(x * 0.055 + 4, z * 0.055) - 1);
  h += sstep(40, 105, r) * (16 + 80 * Math.pow(m, 1.6) + 14 * ridge) * low;
  return h;
}

export function terrainH(x: number, z: number) {
  const r = Math.hypot(x, z);
  let h = -4 + sstep(19, 34, r) * (7 + 5 * fbm(x * 0.07 + 11, z * 0.07 + 5));
  const toward = r > 0.001 ? (x * SUN_XZ[0] + z * SUN_XZ[1]) / r : 0;
  const low = 1 - 0.62 * sstep(0.3, 0.95, toward);
  const m = fbm(x * 0.022 + 3, z * 0.022 + 7);
  const ridge = 1 - Math.abs(2 * vnoise(x * 0.05, z * 0.05) - 1);
  h += sstep(40, 105, r) * (18 + 75 * Math.pow(m, 1.7) + 12 * ridge) * low;
  return h;
}

/** Direction towards the dusk sun over the Tidepool lagoon. */
export const LAGOON_SUN: [number, number, number] = (() => {
  const v = [-0.3, 0.08, -0.95], l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const LAGOON_XZ = (() => {
  const l = Math.hypot(LAGOON_SUN[0], LAGOON_SUN[2]);
  return [LAGOON_SUN[0] / l, LAGOON_SUN[2] / l];
})();

/** Lagoon: a wide sandy ring of low islands, with green hills that open towards the sun. */
export function lagoonTerrainH(x: number, z: number) {
  const r = Math.hypot(x, z);
  let h = -4 + sstep(22, 36, r) * (5 + 4 * fbm(x * 0.07 + 7, z * 0.07 + 3));
  const toward = r > 0.001 ? (x * LAGOON_XZ[0] + z * LAGOON_XZ[1]) / r : 0;
  const low = 1 - 0.7 * sstep(0.2, 0.9, toward);
  const m = fbm(x * 0.026 + 5, z * 0.026 + 9);
  const ridge = 1 - Math.abs(2 * vnoise(x * 0.05 + 2, z * 0.05) - 1);
  h += sstep(44, 105, r) * (10 + 44 * Math.pow(m, 1.6) + 8 * ridge) * low;
  return h;
}

/** Direction towards the rising sun over the Canopy clearing. */
export const FOREST_SUN: [number, number, number] = (() => {
  const v = [0.45, 0.12, -0.88], l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

/** Forest clearing: flat grass around the board, rolling ground under the trees, wooded hills further out. */
export function forestTerrainH(x: number, z: number) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.06 + 3, z * 0.06 + 8) - 0.5) * 0.8 * sstep(8, 16, r);
  const m = fbm(x * 0.022 + 5, z * 0.022 + 9);
  const ridge = 1 - Math.abs(2 * vnoise(x * 0.045 + 2, z * 0.045) - 1);
  h += sstep(24, 110, r) * (6 + 34 * Math.pow(m, 1.5) + 7 * ridge);
  return h;
}
