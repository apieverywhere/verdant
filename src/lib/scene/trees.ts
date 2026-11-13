/**
 * Low-poly trees for Canopy: bent, tapering trunks with a root flare and a few branches, under crowns made of
 * irregular faceted leaf clusters. The four growth stages of a board tile are the same tree at different ages
 * (sapling, young tree, full treetop, tree in blossom), not stacked blocks; each crown is flattened on top so a
 * climber has somewhere to stand.
 */
import { Geo, hexRgb, type RGB, type Vec3 } from './geometry';
import { rng, type Rng } from './terrain';

const TAU = Math.PI * 2;

/** Height a tile gains per growth stage; climbers stand on top of the crown. */
export const LEVEL_H = 0.6;
/** Where the crown starts above the tile for stages 1–4 (below it there is only the trunk), and the blossom's top. */
export const CROWN_BASE = [0, 0.2, 0.58, 1.08, 1.12] as const;
export const BLOSSOM_TOP = 2.08;

const BARK = hexRgb('#6f4e37'), BARK_YOUNG = hexRgb('#86633f');
type Leaves = { dark: RGB; light: RGB };
const SAPLING: Leaves = { dark: hexRgb('#5c9c44'), light: hexRgb('#b4e06c') };
const YOUNG: Leaves = { dark: hexRgb('#3f8742'), light: hexRgb('#93cc5a') };
const MATURE: Leaves = { dark: hexRgb('#2c6a3c'), light: hexRgb('#7ab852') };
const MATURE_WARM: Leaves = { dark: hexRgb('#3d7436'), light: hexRgb('#9cc456') };
const PETALS: Leaves = { dark: hexRgb('#d4568c'), light: hexRgb('#ff9cc0') };
const PETALS_PALE: Leaves = { dark: hexRgb('#ee86b0'), light: hexRgb('#ffc6da') };
const PETALS_WHITE: Leaves = { dark: hexRgb('#ffc9dc'), light: hexRgb('#fff2f6') };
const PINE: Leaves = { dark: hexRgb('#24503c'), light: hexRgb('#3f7a52') };
const FOREST: Leaves[] = [
  { dark: hexRgb('#2f6a3c'), light: hexRgb('#6aa64c') },
  { dark: hexRgb('#3a7438'), light: hexRgb('#86b84e') },
  { dark: hexRgb('#2a5f44'), light: hexRgb('#5c9a58') },
  { dark: hexRgb('#8a7a2e'), light: hexRgb('#d9b54a') }, // the odd tree already turning gold
];

// ---------------------------------------------------------------- building blocks

/** Unit icosphere with one subdivision: 42 vertices, 80 faces. */
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const unit = (v: Vec3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const verts: Vec3[] = ([[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]] as Vec3[]).map(unit);
  const base = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const mids = new Map<number, number>();
  const mid = (a: number, b: number) => {
    const key = a < b ? a * 64 + b : b * 64 + a;
    let i = mids.get(key);
    if (i === undefined) {
      i = verts.length;
      verts.push(unit([verts[a][0] + verts[b][0], verts[a][1] + verts[b][1], verts[a][2] + verts[b][2]]));
      mids.set(key, i);
    }
    return i;
  };
  const faces = base.flatMap(([a, b, c]) => {
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
  });
  return { verts, faces };
})();

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

interface BlobOpts {
  /** How far each vertex may move in or out, as a fraction of the radius. */
  jitter?: number;
  /** Vertical radius of the lower half; crowns are flatter underneath. */
  down?: number;
  /** Vertices above this height are pressed down onto it, which leaves a flat top. */
  top?: number;
}

/**
 * A leaf cluster: a faceted, lumpy ball centred on `c` with radii `r`. Faces that look up take the light leaf
 * colour, faces underneath the dark one, each with a little random variation.
 */
function blob(g: Geo, c: Vec3, r: Vec3, leaves: Leaves, R: Rng, { jitter = 0.16, down = r[1], top = Infinity }: BlobOpts = {}) {
  const rot = R() * TAU, cs = Math.cos(rot), sn = Math.sin(rot);
  const P = ICO.verts.map((v): Vec3 => {
    const k = 1 + (R() * 2 - 1) * jitter;
    const x = v[0] * cs + v[2] * sn, z = -v[0] * sn + v[2] * cs;
    return [c[0] + x * r[0] * k, Math.min(top, c[1] + v[1] * (v[1] < 0 ? down : r[1]) * k), c[2] + z * r[2] * k];
  });
  for (const [i, j, k] of ICO.faces) {
    const up = (ICO.verts[i][1] + ICO.verts[j][1] + ICO.verts[k][1]) / 3;
    const col = mix(leaves.dark, leaves.light, Math.min(1, Math.max(0, up * 0.62 + 0.42))), s = 0.9 + R() * 0.2;
    g.tri(P[i], P[j], P[k], [col[0] * s, col[1] * s, col[2] * s], c);
  }
}

/** The main cluster of a crown, flattened at `top` (the height a climber stands on). */
function crownTop(g: Geo, c: Vec3, rx: number, top: number, base: number, leaves: Leaves, R: Rng) {
  const jitter = 0.14;
  // Tall enough that even a vertex jittered inwards reaches `top`, so the flat patch has no dents.
  const ry = ((top - c[1]) / (1 - jitter)) * 1.06;
  blob(g, c, [rx, ry, rx], leaves, R, { jitter, top, down: (c[1] - base) / (1 + jitter) });
}

/** A trunk along `spine` with one horizontal ring of `n` corners per point. */
function trunk(g: Geo, spine: Vec3[], radii: number[], n: number, c: RGB, R: Rng) {
  const twist = R() * TAU;
  const ring = (p: Vec3, r: number, a: number): Vec3 => [p[0] + Math.cos(a) * r, p[1], p[2] + Math.sin(a) * r];
  for (let s = 0; s < spine.length - 1; s++) {
    const a = spine[s], b = spine[s + 1], inside: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    for (let i = 0; i < n; i++) {
      const a0 = twist + (i / n) * TAU, a1 = twist + ((i + 1) / n) * TAU, k = 0.86 + R() * 0.24;
      g.quad(ring(a, radii[s], a0), ring(a, radii[s], a1), ring(b, radii[s + 1], a1), ring(b, radii[s + 1], a0), [c[0] * k, c[1] * k, c[2] * k], inside);
    }
  }
}

/** A straight branch from `a` to `b`, tapering from `ra` to a point-like `rb`. */
function limb(g: Geo, a: Vec3, ra: number, b: Vec3, rb: number, c: RGB) {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
  const ax: Vec3 = [d[0] / l, d[1] / l, d[2] / l];
  // Two directions across the branch; branches are never vertical, so "up" is a safe reference.
  let u: Vec3 = [ax[2], 0, -ax[0]];
  const ul = Math.hypot(u[0], u[2]) || 1;
  u = [u[0] / ul, 0, u[2] / ul];
  const v: Vec3 = [ax[1] * u[2], ax[2] * u[0] - ax[0] * u[2], -ax[1] * u[0]];
  const at = (p: Vec3, r: number, t: number): Vec3 => {
    const cs = Math.cos(t) * r, sn = Math.sin(t) * r;
    return [p[0] + u[0] * cs + v[0] * sn, p[1] + u[1] * cs + v[1] * sn, p[2] + u[2] * cs + v[2] * sn];
  };
  const inside: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], n = 5;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * TAU, t1 = ((i + 1) / n) * TAU;
    g.quad(at(a, ra, t0), at(a, ra, t1), at(b, rb, t1), at(b, rb, t0), c, inside);
  }
}

/** Spine of a gently bending trunk that leans towards `lean` (radians) as it rises to `height`. */
function bentSpine(height: number, lean: number, bend: number, steps: number, R: Rng): Vec3[] {
  const pts: Vec3[] = [[0, 0, 0]];
  const wob = R() * TAU;
  for (let k = 1; k <= steps; k++) {
    const t = k / steps, off = bend * t * t, w = Math.sin(t * Math.PI) * bend * 0.45;
    pts.push([Math.cos(lean) * off + Math.cos(wob) * w, height * t, Math.sin(lean) * off + Math.sin(wob) * w]);
  }
  return pts;
}

// ---------------------------------------------------------------- growth stages on the board

/**
 * One growth stage of a board tile, standing on the origin: 1 sapling, 2 young tree, 3 full treetop, 4 blossom.
 * Stages 1–3 are exactly `level × LEVEL_H` tall with a flat patch on top. The same `seed` leans the same way at
 * every stage, so a tile reads as one tree growing up.
 */
export function growthStage(level: number, seed: number): Geo {
  const g = new Geo(), R = rng(seed * 7919 + 13), lean = R() * TAU, top = level * LEVEL_H;
  const S = rng(seed * 104729 + level * 31);
  const around = (n: number, dist: number, y: number, fn: (p: Vec3, k: number) => void) => {
    const a0 = S() * TAU;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * TAU + (S() - 0.5) * 0.5, d = dist * (0.88 + S() * 0.24);
      fn([Math.cos(a) * d, y + (S() - 0.5) * 0.08, Math.sin(a) * d], k);
    }
  };

  if (level === 1) {
    const spine = bentSpine(0.32, lean, 0.05, 2, S), tip = spine[spine.length - 1];
    trunk(g, spine, [0.085, 0.058, 0.04], 5, BARK_YOUNG, S);
    around(2, 0.2, 0.3, (p) => blob(g, p, [0.17, 0.13, 0.17], SAPLING, S, { down: 0.09 }));
    crownTop(g, [tip[0], 0.39, tip[2]], 0.31, top, CROWN_BASE[1], SAPLING, S);
    return g;
  }

  if (level === 2) {
    const spine = bentSpine(0.86, lean, 0.07, 4, S), tip = spine[spine.length - 1];
    trunk(g, [[0, 0, 0], [spine[1][0] * 0.3, 0.07, spine[1][2] * 0.3], ...spine.slice(1)], [0.19, 0.115, 0.1, 0.085, 0.07, 0.05], 6, BARK_YOUNG, S);
    around(3, 0.27, 0.8, (p) => {
      limb(g, spine[3], 0.035, [p[0] * 0.8, p[1] - 0.02, p[2] * 0.8], 0.012, BARK_YOUNG);
      blob(g, p, [0.25, 0.19, 0.25], YOUNG, S, { down: 0.14 });
    });
    crownTop(g, [tip[0], 0.9, tip[2]], 0.43, top, CROWN_BASE[2] + 0.06, YOUNG, S);
    return g;
  }

  const blossom = level >= 4;
  const height = blossom ? 1.4 : 1.34;
  const spine = bentSpine(height, lean, 0.09, 5, S), tip = spine[spine.length - 1];
  trunk(g, [[0, 0, 0], [spine[1][0] * 0.3, 0.1, spine[1][2] * 0.3], ...spine.slice(1)], [0.27, 0.165, 0.15, 0.135, 0.12, 0.1, 0.07], 7, BARK, S);
  // roots spreading over the moss
  around(4, 0.3, 0.02, (p) => limb(g, [p[0] * 0.3, 0.13, p[2] * 0.3], 0.07, [p[0], 0.0, p[2]], 0.025, BARK));

  if (!blossom) {
    around(4, 0.33, 1.2, (p, k) => {
      limb(g, spine[3], 0.05, [p[0] * 0.85, p[1] - 0.04, p[2] * 0.85], 0.018, BARK);
      blob(g, p, [0.3, 0.23, 0.3], k % 2 ? MATURE_WARM : MATURE, S, { down: 0.16 });
    });
    around(2, 0.22, 1.02, (p) => blob(g, p, [0.2, 0.15, 0.2], MATURE, S, { down: 0.1 }));
    crownTop(g, [tip[0], 1.46, tip[2]], 0.5, top, CROWN_BASE[3] + 0.08, MATURE_WARM, S);
    return g;
  }

  // In blossom: the same tree, crown rounded off (nobody stands here any more) and covered in petals.
  around(5, 0.35, 1.26, (p, k) => {
    limb(g, spine[3], 0.05, [p[0] * 0.85, p[1] - 0.04, p[2] * 0.85], 0.018, BARK);
    blob(g, p, [0.31, 0.25, 0.31], k % 2 ? PETALS_PALE : PETALS, S, { down: 0.17 });
  });
  blob(g, [tip[0], 1.58, tip[2]], [0.52, BLOSSOM_TOP - 1.58, 0.52], PETALS, S, { jitter: 0.12, down: 0.36, top: BLOSSOM_TOP });
  around(7, 0.4, 1.62, (p) => blob(g, [p[0], p[1] + S() * 0.3, p[2]], [0.1, 0.09, 0.1], PETALS_WHITE, S, { jitter: 0.2 }));
  return g;
}

// ---------------------------------------------------------------- the forest around the clearing

/** A broadleaf tree of the surrounding forest, `s` times the size of a board treetop. */
export function forestTree(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
  const leaves = FOREST[R() < 0.1 ? 3 : Math.floor(R() * 3)], other = FOREST[Math.floor(R() * 3)];
  const h = (1.5 + R() * 0.9) * s, lean = R() * TAU;
  const spine = bentSpine(h, lean, 0.18 * s, 4, R).map((p): Vec3 => [x + p[0], y + p[1], z + p[2]]);
  const tip = spine[spine.length - 1];
  trunk(g, [[x, y - 0.3, z], ...spine.slice(1)], [0.3 * s, 0.19 * s, 0.16 * s, 0.13 * s, 0.08 * s], 6, BARK, R);
  const n = 3 + Math.floor(R() * 3), a0 = R() * TAU;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * TAU + (R() - 0.5) * 0.6, d = (0.55 + R() * 0.25) * s;
    const p: Vec3 = [tip[0] + Math.cos(a) * d, tip[1] - (0.1 + R() * 0.35) * s, tip[2] + Math.sin(a) * d];
    limb(g, spine[3], 0.07 * s, p, 0.02 * s, BARK);
    const r = (0.5 + R() * 0.2) * s;
    blob(g, p, [r, r * 0.8, r], k % 2 ? other : leaves, R, { jitter: 0.2, down: r * 0.55 });
  }
  const r = (0.75 + R() * 0.25) * s;
  blob(g, [tip[0], tip[1] + 0.25 * s, tip[2]], [r, r * 0.85, r], leaves, R, { jitter: 0.2, down: r * 0.5 });
}

/** A conifer: drooping skirts of needles around a straight trunk, each tier turned a little. */
export function pine(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
  g.frustum(x, z, y - 0.3, 0.2 * s, y + 1.2 * s, 0.11 * s, 6, BARK);
  const tiers = 4 + Math.floor(R() * 2);
  let y0 = y + 0.8 * s;
  for (let k = 0; k < tiers; k++) {
    const t = k / tiers, r0 = (1.25 - t * 0.95) * s, hgt = (1.15 - t * 0.35) * s;
    const col = mix(PINE.dark, PINE.light, 0.25 + t * 0.6 + R() * 0.15);
    const last = k === tiers - 1;
    g.frustum(x + (R() - 0.5) * 0.08 * s, z + (R() - 0.5) * 0.08 * s, y0, r0, y0 + hgt, last ? 0 : r0 * 0.3, 7, col, col, R() * TAU);
    y0 += hgt * 0.62;
  }
}

/** A low shrub for the edge of the clearing. */
export function bush(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
  const leaves = FOREST[Math.floor(R() * 3)];
  for (let k = 0; k < 3; k++) {
    const a = R() * TAU, d = k ? 0.35 * s : 0, r = (k ? 0.35 : 0.5) * s;
    blob(g, [x + Math.cos(a) * d, y + r * 0.45, z + Math.sin(a) * d], [r, r * 0.75, r], leaves, R, { jitter: 0.22, down: r * 0.5 });
  }
}
