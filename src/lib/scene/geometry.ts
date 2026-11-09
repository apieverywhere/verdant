/**
 * Low-poly geometry builder ported from the design. Every triangle gets its own face normal and colour,
 * which gives the faceted look; `toGeometry()` turns the result into a three.js BufferGeometry.
 */
import { BufferAttribute, BufferGeometry } from 'three';

export type Vec3 = [number, number, number];
export type RGB = [number, number, number];
/** 'up' forces normals upwards; a point makes normals face away from it. */
type Inside = 'up' | Vec3 | undefined;

export function hexRgb(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class Geo {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];

  tri(p: Vec3, q: Vec3, s: Vec3, c: RGB, inside?: Inside) {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
    const vx = s[0] - p[0], vy = s[1] - p[1], vz = s[2] - p[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    if (inside === 'up') {
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    } else if (inside) {
      const cx = (p[0] + q[0] + s[0]) / 3 - inside[0];
      const cy = (p[1] + q[1] + s[1]) / 3 - inside[1];
      const cz = (p[2] + q[2] + s[2]) / 3 - inside[2];
      if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    }
    // Keep counter-clockwise winding consistent with the chosen normal so front faces render.
    const flip = (uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < 0;
    const pts = flip ? [p, s, q] : [p, q, s];
    for (const v of pts) {
      this.pos.push(v[0], v[1], v[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(c[0], c[1], c[2]);
    }
  }

  quad(p: Vec3, q: Vec3, s: Vec3, t: Vec3, c: RGB, inside?: Inside) {
    this.tri(p, q, s, c, inside);
    this.tri(p, s, t, c, inside);
  }

  /** Box centred on (cx, cy, cz), tilted by `rz` around z first, then turned by `ry` around y. */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, c: RGB, ry = 0, rz = 0) {
    const cs = Math.cos(ry), sn = Math.sin(ry), c2 = Math.cos(rz), s2 = Math.sin(rz), hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const P: Vec3[] = [];
    for (let i = 0; i < 8; i++) {
      const x0 = i & 1 ? hx : -hx, y0 = i & 2 ? hy : -hy, z = i & 4 ? hz : -hz;
      const x = x0 * c2 - y0 * s2, y = x0 * s2 + y0 * c2;
      P.push([cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs]);
    }
    const center: Vec3 = [cx, cy, cz];
    const F = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];
    for (const f of F) this.quad(P[f[0]], P[f[1]], P[f[2]], P[f[3]], c, center);
  }

  /** Truncated cone (or cone when r1 = 0) with `n` sides, base at y0 and top at y1. */
  frustum(cx: number, cz: number, y0: number, r0: number, y1: number, r1: number, n: number, c: RGB, capC: RGB | null = null, rot = 0) {
    const inside: Vec3 = [cx, (y0 + y1) / 2, cz], TAU = Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU, a1 = rot + ((i + 1) / n) * TAU;
      const p00: Vec3 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0];
      const p01: Vec3 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
      if (r1 > 0.001) {
        const p10: Vec3 = [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1];
        const p11: Vec3 = [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1];
        this.quad(p00, p01, p11, p10, c, inside);
        this.tri([cx, y1, cz], p10, p11, capC ?? c, inside);
      } else {
        this.tri(p00, p01, [cx, y1, cz], c, inside);
      }
      this.tri([cx, y0, cz], p00, p01, c, inside);
    }
  }

  /** UV sphere of radius R centred on the origin, with smooth (per-vertex) normals. */
  sphere(R: number, nu: number, nv: number, c: RGB) {
    const P = (i: number, j: number): Vec3 => {
      const u = (i / nu) * Math.PI * 2, v = -Math.PI / 2 + (j / nv) * Math.PI;
      return [Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u)];
    };
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = P(i, j), b = P(i + 1, j), d = P(i + 1, j + 1), e = P(i, j + 1);
        // Wound counter-clockwise seen from outside, so front faces point outwards.
        for (const n of [a, d, b, a, e, d]) {
          this.pos.push(n[0] * R, n[1] * R, n[2] * R);
          this.nor.push(n[0], n[1], n[2]);
          this.col.push(c[0], c[1], c[2]);
        }
      }
    }
  }

  torus(R: number, r: number, nu: number, nv: number, c: RGB, y: number) {
    const TAU = Math.PI * 2;
    const pt = (u: number, v: number): Vec3 => [
      (R + r * Math.cos(v)) * Math.cos(u),
      y + r * Math.sin(v),
      (R + r * Math.cos(v)) * Math.sin(u),
    ];
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const u0 = (i / nu) * TAU, u1 = ((i + 1) / nu) * TAU, v0 = (j / nv) * TAU, v1 = ((j + 1) / nv) * TAU;
        const um = (u0 + u1) / 2;
        this.quad(pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1), c, [R * Math.cos(um), y, R * Math.sin(um)]);
      }
    }
  }

  /** Extrudes a star-shaped 2D outline (x, z) between heights y0 and y1, capped on top. */
  extrude(pts: readonly (readonly [number, number])[], y0: number, y1: number, c: RGB) {
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p[0], 0) / n, mz = pts.reduce((s, p) => s + p[1], 0) / n;
    const inside: Vec3 = [mx, (y0 + y1) / 2, mz];
    pts.forEach((a, j) => {
      const b = pts[(j + 1) % n];
      this.tri([mx, y1, mz], [a[0], y1, a[1]], [b[0], y1, b[1]], c, 'up');
      this.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], c, inside);
    });
  }

  toGeometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3));
    g.computeBoundingSphere();
    return g;
  }
}
