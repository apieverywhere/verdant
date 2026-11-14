/**
 * three.js scene for Tidepool: a golden-hour lagoon with palm islands and a sand dais ringed by rocks and stone
 * lanterns. On it stands the board: a raised honeycomb of 61 cupped tiles inside a sloped gutter, with the ramp and
 * the collection tray beside it. Marbles are glossy and mirror the sky; the sun casts real shadows. Like the other
 * controllers it holds no game state of its own: it receives a view, and animates marbles from the last move the
 * view reports.
 */
import * as THREE from 'three';
import type { Cell, Player } from '../game/types';
import { CELLS, NB, WIN_PUSHES, type Move, type MoveResult } from '../tidepool/rules';
import { FrameBudget } from './frameBudget';
import { Geo, hexRgb, mix, shade, type RGB, type Vec3 } from './geometry';
import { lagoonWaterMaterial, skyMaterial } from './shaders';
import { hash2, LAGOON_SUN, lagoonTerrainH, rng, type Rng } from './terrain';

export interface TidepoolView {
  board: Cell[];
  ids: number[];
  owners: Player[];
  turn: Player;
  /** Selected marbles of the side to move. */
  sel: number[];
  /** Legal moves for the selection; each gets a gold marker. */
  moves: Move[];
  last: MoveResult | null;
  moveCount: number;
  /** Whether a human may click right now. */
  interactive: boolean;
  /** Changes on every new game so marbles reset without animation. */
  gameId: number;
}

/** What a click hit: a gold move marker, or a board hole (−1 = off the board). */
export type TidepoolPick = { kind: 'move'; index: number } | { kind: 'cell'; cell: number };

const COL = {
  sky: { top: hexRgb('#0e2333'), mid: hexRgb('#2f6f8f'), hor: hexRgb('#ffb98a'), fog: hexRgb('#8fb3bf'), sun: hexRgb('#ffe2b0') },
  light: { sun: [1.0, 0.84, 0.66] as RGB, sky: [0.44, 0.54, 0.68] as RGB, gnd: [0.24, 0.23, 0.2] as RGB },
  water: { deep: hexRgb('#1b7686'), shallow: hexRgb('#4fc2b8'), foam: hexRgb('#f3fbf5') },
  sand: hexRgb('#e3d0a4'), sand2: hexRgb('#d3bd8e'), wet: hexRgb('#b9a57c'),
  grass: hexRgb('#3f7a55'), grass2: hexRgb('#4f8a5a'), rock: hexRgb('#4f6470'), rock2: hexRgb('#6b8090'),
  trunk: hexRgb('#7a5a3e'), palm: hexRgb('#3f8a4f'), palm2: hexRgb('#2f7346'),
  board: hexRgb('#23445a'), tileIn: hexRgb('#4a879c'), tileOut: hexRgb('#2f5d74'), dish: hexRgb('#1c3d50'), pit: hexRgb('#13293a'),
  gutter: hexRgb('#183444'), trim: hexRgb('#e0b56e'), tray: hexRgb('#1f3b4e'), star: hexRgb('#f08a5d'),
  X: hexRgb('#f1e8d8'), O: hexRgb('#ff6652'), gold: hexRgb('#ffd27a'), lantern: hexRgb('#ffb45a'),
};
const LIGHT_DIR = new THREE.Vector3(-0.42, 0.62, -0.6).normalize();
const FOG_DENSITY = 0.0068;
const FOV = 0.85; // radians, as in the design
const DEFAULT_DIST = 19;
/** Half-width (world units) that must stay visible on narrow screens: the board, gutter and tray. */
const BOARD_FIT = 8.4;
/** How far the orbit point drops so the board clears the bottom HUD (taller on portrait screens). */
const PORTRAIT_DROP = 1.6;
const LANDSCAPE_DROP = 1.7;
const IDLE_ROTATE_MS = 7000;
const STEP_MS = 300;
/** How long after a change the shadow map keeps being redrawn: long enough for a marble to roll into the tray. */
const SHADOW_MS = 2500;
const TAU = Math.PI * 2;
/** Where still water meets the dais; the foam follows this radius. */
const SHORE = 13.05;
/** Stone lanterns standing on the sand; they also warm the sand around them. */
const LAMPS: [number, number][] = [[-6.6, -7.4], [6.2, -7.6], [-7.4, 6.6], [6.4, 7.6]];

// board geometry (axial hex, 61 holes)
const HD = 1.25, SQ3 = Math.sqrt(3), BT = 1.63, MY = BT + 0.4;
const holeX = (i: number) => HD * (CELLS[i].q + CELLS[i].r / 2);
const holeZ = (i: number) => HD * (SQ3 / 2) * CELLS[i].r;
const cellPos = (i: number): Vec3 => [holeX(i), MY, holeZ(i)];
const dirVec = (d: number): [number, number] => {
  const dq = d === 0 || d === 1 ? 1 : d === 3 || d === 4 ? -1 : 0;
  const dr = d === 1 || d === 2 ? -1 : d === 4 || d === 5 ? 1 : 0;
  return [HD * (dq + dr / 2), HD * (SQ3 / 2) * dr];
};

/** Collection tray beside the board (right side), one row per colour. */
const trayPos = (owner: Player, slot: number): Vec3 => [owner === 'X' ? 9.25 : 10.25, 1.5, -2.5 + slot * 1.0];
// gutter around the board: highest on the far left, sloping down to the ramp at angle 0
const GUT_V = 6.7;
const hexR = (th: number, rv: number) => {
  const s = Math.PI / 3, t = (((th % s) + s) % s) - s / 2;
  return (rv * Math.cos(Math.PI / 6)) / Math.cos(t);
};
const floorH = (th: number) => 1.02 + (0.34 * (1 - Math.cos(th))) / 2;
const gutPt = (th: number): Vec3 => {
  const r = hexR(th, GUT_V);
  return [Math.cos(th) * r, floorH(th) + 0.5, Math.sin(th) * r];
};

/** Path of a marble pushed off the edge: over the rim, round the gutter, down the ramp and into the tray. */
function offPath(from: number, d: number, owner: Player, slot: number): Vec3[] {
  const p0 = cellPos(from), v = dirVec(d), p1: Vec3 = [p0[0] + v[0] * 0.8, MY + 0.05, p0[2] + v[1] * 0.8];
  const th = Math.atan2(p1[2], p1[0]), pts: Vec3[] = [p0, p1, gutPt(th)], step = th > 0 ? -0.08 : 0.08;
  let a = th;
  while (Math.abs(a) > 0.09) {
    a += step;
    if ((step < 0 && a < 0) || (step > 0 && a > 0)) a = 0;
    pts.push(gutPt(a));
  }
  pts.push(gutPt(0), [7.6, 1.51, 0], [8.7, 1.5, 0], trayPos(owner, slot));
  return pts;
}

type Anim =
  | { kind: 'step'; from: Vec3; to: Vec3; t0: number; arc: number }
  | { kind: 'path'; pts: Vec3[]; L: number[]; total: number; t0: number };

function pathAnim(pts: Vec3[], t0: number): Anim {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  return { kind: 'path', pts, L, total: L[L.length - 1], t0 };
}

type LambertMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;

export class TidepoolController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private clock0 = performance.now();
  private raf = 0;
  private lastT = 0;
  private budget = new FrameBudget();
  private resizeObs: ResizeObserver;
  private handlers: [string, EventListener, AddEventListenerOptions | boolean][] = [];

  private cam = { yaw: 0, pitch: 0.92, dist: DEFAULT_DIST, target: new THREE.Vector3(0, 1.4, 0) };
  private lastInteract = performance.now();
  private dragging = false;
  private hoverCell = -1;
  private hoverMarker = -1;

  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private water!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private env!: THREE.WebGLRenderTarget;
  private marbles: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>[] = [];
  private marbleOwner: (Player | undefined)[] = [];
  /** Gold diamonds bobbing over the holes a selection can move to, each above a ring on the board. */
  private gems: LambertMesh[] = [];
  private markRings: LambertMesh[] = [];
  private selRings: LambertMesh[] = [];
  private lastRings: LambertMesh[] = [];
  private lanterns!: THREE.InstancedMesh;
  private lanternData: { x: number; z: number; ph: number; sp: number; sw: number; s: number }[] = [];
  private floats!: THREE.InstancedMesh;
  private floatData: { a: number; r: number; ph: number; s: number }[] = [];

  private view: TidepoolView | null = null;
  /** Resting place of each marble id that has left the board. */
  private tray = new Map<number, Vec3>();
  private anims = new Map<number, Anim>();
  private shadowsUntil = 0;
  private markerPos: Vec3[] = [];
  /** Height of each marker's diamond: just over an empty hole, or above the marble it would push. */
  private gemY: number[] = [];
  autoRotate = false;

  constructor(private canvas: HTMLCanvasElement, private onPick: (hit: TidepoolPick) => void) {
    THREE.ColorManagement.enabled = false; // use the design's colour values as-is
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(new THREE.Color(...COL.sky.fog), 1);
    this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(FOV), 1, 0.3, 1500);

    this.scene.fog = new THREE.FogExp2(new THREE.Color(...COL.sky.fog), FOG_DENSITY);
    // Intensity π: three's Lambert BRDF divides by π, this restores the design's lighting formula.
    this.scene.add(new THREE.HemisphereLight(new THREE.Color(...COL.light.sky), new THREE.Color(...COL.light.gnd), Math.PI));
    const sun = new THREE.DirectionalLight(new THREE.Color(...COL.light.sun), Math.PI);
    sun.position.copy(LIGHT_DIR).multiplyScalar(40);
    // The sun's shadow covers the dais only; the islands are too far away to need one.
    this.renderer.shadowMap.enabled = true;
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    // The scene is mostly still, so the shadow map is redrawn only while something moves (see frame()).
    this.renderer.shadowMap.autoUpdate = false;
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 5, far: 80 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);

    this.buildScene();
    this.bindInput();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  // ---------------------------------------------------------------- building

  private lambert(opts: THREE.MeshLambertMaterialParameters = {}) {
    return new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
  }

  private buildScene() {
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 18),
      skyMaterial({ sun: LAGOON_SUN, top: COL.sky.top, mid: COL.sky.mid, hor: COL.sky.hor, fog: COL.sky.fog, sunCol: COL.sky.sun }),
    );
    this.sky.scale.setScalar(500);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    this.scene.add(new THREE.Mesh(this.buildTerrain().toGeometry(), this.lambert()));

    // Everything on the dais is one mesh that casts and receives the sun's shadow.
    const R = rng(11), dais = new Geo(), lamps = new Geo();
    this.buildDais(dais, lamps, R);
    this.buildBoard(dais, R);
    const set = new THREE.Mesh(dais.toGeometry(), this.lambert());
    set.castShadow = set.receiveShadow = true;
    this.scene.add(set);
    this.scene.add(new THREE.Mesh(lamps.toGeometry(), this.glow(this.lambert(), COL.lantern, 0.9)));

    const S = 340, wg = new THREE.PlaneGeometry(S * 2, S * 2).rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, lagoonWaterMaterial({
      deep: COL.water.deep, shallow: COL.water.shallow, foam: COL.water.foam, light: LIGHT_DIR.toArray(), sun: LAGOON_SUN,
      sunCol: COL.light.sun, skyCol: COL.light.sky, gndCol: COL.light.gnd, fog: COL.sky.fog, fogDensity: FOG_DENSITY, shore: SHORE,
    }));
    this.scene.add(this.water);

    // Glossy marbles under a clear coat; they mirror the dusk sky.
    this.env = this.buildEnv();
    const ball = new THREE.SphereGeometry(0.5, 36, 24);
    for (let id = 0; id < 28; id++) {
      const mat = new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: 0.04, envMap: this.env.texture });
      const mesh = new THREE.Mesh(ball, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.visible = false;
      this.marbles.push(mesh);
      this.scene.add(mesh);
    }

    const pool = (geo: THREE.BufferGeometry, n: number, into: LambertMesh[]) => {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, this.lambert());
        m.visible = false;
        into.push(m);
        this.scene.add(m);
      }
    };
    const gem = new Geo();
    gem.frustum(0, 0, 0, 0.17, 0.3, 0, 4, COL.gold);
    gem.frustum(0, 0, 0, 0.17, -0.3, 0, 4, COL.gold);
    pool(gem.toGeometry(), 6, this.gems);
    const ring = new Geo();
    ring.torus(0.56, 0.045, 28, 5, COL.gold, 0);
    const rg = ring.toGeometry();
    pool(rg, 6, this.markRings);
    pool(rg, 3, this.selRings);
    pool(rg, 3, this.lastRings);
    this.lastRings.forEach((m) => this.glow(m.material, COL.gold, 0.35, [0.75, 0.75, 0.75]));

    // paper lanterns: some rise into the sky, some drift on the lagoon
    const lg = new Geo();
    lg.frustum(0, 0, 0, 0.3, 0.75, 0.42, 6, COL.lantern, COL.lantern);
    const L = rng(31);
    for (let k = 0; k < 20; k++) {
      const a = L() * TAU, r = 13 + L() * 40;
      this.lanternData.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ph: L(), sp: 0.01 + L() * 0.012, sw: L() * 6, s: 0.6 + L() * 0.5 });
    }
    this.lanterns = new THREE.InstancedMesh(lg.toGeometry(), this.glow(this.lambert(), COL.lantern, 0.95), this.lanternData.length);
    this.lanterns.frustumCulled = false;
    this.scene.add(this.lanterns);

    const fg = new Geo();
    fg.frustum(0, 0, 0, 0.3, 0.46, 0.36, 6, COL.lantern, COL.lantern);
    for (let k = 0; k < 16; k++) this.floatData.push({ a: (k / 16) * TAU + L() * 0.5, r: 15.5 + L() * 15, ph: L() * TAU, s: 0.8 + L() * 0.5 });
    this.floats = new THREE.InstancedMesh(fg.toGeometry(), this.glow(this.lambert(), COL.lantern, 0.85), this.floatData.length);
    this.floats.frustumCulled = false;
    this.scene.add(this.floats);
  }

  /** Design's emission: colour = mix(lit, base·1.35, e) → scale diffuse by (1−e), add base·1.35·e. */
  private glow(m: THREE.MeshLambertMaterial, base: RGB, e: number, tint: RGB = [1, 1, 1]) {
    m.color.setRGB(tint[0] * (1 - e), tint[1] * (1 - e), tint[2] * (1 - e));
    m.emissive.setRGB(base[0] * tint[0] * 1.35 * e, base[1] * tint[1] * 1.35 * e, base[2] * tint[2] * 1.35 * e);
    return m;
  }

  /** What the marbles reflect: the sky dome over a dark floor standing in for the board, prefiltered once. */
  private buildEnv(): THREE.WebGLRenderTarget {
    const s = new THREE.Scene(), dome = new THREE.Mesh(this.sky.geometry, this.sky.material);
    dome.scale.setScalar(50);
    dome.renderOrder = -1;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.3, 0.36) }));
    floor.position.y = -1.5;
    s.add(dome, floor);
    const pmrem = new THREE.PMREMGenerator(this.renderer), rt = pmrem.fromScene(s, 0, 0.1, 200, { size: 64 }) // small pieces only need a coarse reflection;
    pmrem.dispose();
    floor.geometry.dispose();
    floor.material.dispose();
    return rt;
  }

  /** The lagoon's ring of islands and their palms. */
  private buildTerrain(): Geo {
    const g = new Geo(), N = 150, S = 330, st = S / N, H: Vec3[] = [];
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        let x = -S / 2 + i * st, z = -S / 2 + j * st;
        if (i > 0 && i < N && j > 0 && j < N) {
          x += (hash2(i * 3.1, j * 1.7) - 0.5) * st * 0.55;
          z += (hash2(i * 1.3, j * 2.9) - 0.5) * st * 0.55;
        }
        H.push([x, lagoonTerrainH(x, z), z]);
      }
    }
    const R = rng(4);
    const tcol = (p: Vec3, q: Vec3, s: Vec3): RGB => {
      const h = (p[1] + q[1] + s[1]) / 3;
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = s[0] - p[0], vy = s[1] - p[1], vz = s[2] - p[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const ly = Math.abs(ny) / (Math.hypot(nx, ny, nz) || 1);
      let c: RGB;
      if (h < 1.2) c = COL.sand;
      else if (ly > 0.7 && h < 22) c = h < 7 ? COL.grass2 : COL.grass;
      else if (h > 26) c = COL.rock2;
      else c = COL.rock;
      return shade(c, 0.94 + R() * 0.12);
    };
    for (let jj = 0; jj < N; jj++) {
      for (let ii = 0; ii < N; ii++) {
        const a = H[jj * (N + 1) + ii], b = H[jj * (N + 1) + ii + 1], c = H[(jj + 1) * (N + 1) + ii + 1], d = H[(jj + 1) * (N + 1) + ii];
        if (Math.max(a[1], b[1], c[1]) > -0.8) g.tri(a, b, c, tcol(a, b, c), 'up');
        if (Math.max(a[1], c[1], d[1]) > -0.8) g.tri(a, c, d, tcol(a, c, d), 'up');
      }
    }
    let placed = 0;
    for (let t = 0; t < 1500 && placed < 90; t++) {
      const ang = R() * TAU, rr = 26 + R() * 18;
      const px = Math.cos(ang) * rr, pz = Math.sin(ang) * rr, ph = lagoonTerrainH(px, pz);
      if (ph < 0.6 || ph > 8) continue;
      this.palm(g, px, ph - 0.2, pz, 0.9 + R() * 0.7, R);
      placed++;
    }
    return g;
  }

  /** The sand dais the board stands on: rock skirt, faceted sand, boulders, palms, starfish and stone lanterns. */
  private buildDais(g: Geo, glowG: Geo, R: Rng) {
    g.frustum(0, 0, -4.5, 14.0, 0.3, 12.98, 30, COL.rock, COL.rock, 0.1);
    // Sand in jittered rings, so every facet catches the light a little differently.
    const NS = 30, rad = [6.8, 8.2, 9.6, 11.0, 12.3, 13.0], V: Vec3[][] = [];
    rad.forEach((r0, k) => {
      const row: Vec3[] = [], mid = k > 0 && k < 4;
      for (let i = 0; i < NS; i++) {
        const a = (i / NS) * TAU + 0.1 + (mid ? (R() - 0.5) * 0.08 : 0), r = r0 + (mid ? (R() - 0.5) * 0.5 : 0);
        const y = k === 5 ? 0.28 : k === 4 ? 0.84 : 0.9 + (mid ? (R() - 0.5) * 0.06 : 0);
        row.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      }
      V.push(row);
    });
    const sandCol = (p: Vec3, q: Vec3, s: Vec3): RGB => {
      const cx = (p[0] + q[0] + s[0]) / 3, cy = (p[1] + q[1] + s[1]) / 3, cz = (p[2] + q[2] + s[2]) / 3;
      const c = shade(cy < 0.8 ? COL.wet : mix(COL.sand, COL.sand2, R()), 0.96 + R() * 0.08);
      // lantern light baked into the sand
      let w = 0;
      for (const [lx, lz] of LAMPS) w += Math.exp(-((cx - lx) ** 2 + (cz - lz) ** 2) / 3.2);
      w = Math.min(1, w);
      return [c[0] * (1 + 0.06 * w) + 0.06 * w, c[1] * (1 + 0.02 * w) + 0.02 * w, c[2] * (1 - 0.12 * w)];
    };
    for (let k = 0; k < rad.length - 1; k++) {
      for (let i = 0; i < NS; i++) {
        const a = V[k][i], b = V[k][(i + 1) % NS], c = V[k + 1][(i + 1) % NS], d = V[k + 1][i];
        g.tri(a, b, c, sandCol(a, b, c), 'up');
        g.tri(a, c, d, sandCol(a, c, d), 'up');
      }
    }
    // boulders in the shallows, a few pebbles on the sand
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * TAU + R() * 0.4, r = 13.0 + R() * 0.9;
      this.rock(g, Math.cos(a) * r, -0.5, Math.sin(a) * r, 0.7 + R() * 1.0, R);
    }
    for (const [x, z, s] of [[-10.6, -3.4, 0.55], [-9.9, -4.3, 0.36], [3.2, -11.0, 0.5], [-4.2, 10.9, 0.45], [-5.1, 10.5, 0.3], [11.2, 5.0, 0.4]]) {
      this.rock(g, x, 0.82, z, s, R);
    }
    this.palm(g, 9.6, 0.8, -7.2, 0.85, R);
    this.palm(g, -10.4, 0.8, 2.6, 0.75, R);
    this.palm(g, -9.4, 0.8, -6.4, 0.62, R);
    for (const [x, z, s] of [[4.6, 10.4, 0.5], [10.7, -5.2, 0.42], [-2.2, -10.7, 0.46], [-10.9, 6.0, 0.38]]) {
      const rot = R() * TAU, pts: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const a = rot + (k / 10) * TAU, r = k % 2 ? s * 0.42 : s;
        pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]);
      }
      g.extrude(pts, 0.86, 0.99, shade(COL.star, 0.92 + R() * 0.16));
    }
    for (const [x, z] of LAMPS) {
      g.frustum(x, z, 0.8, 0.36, 1.02, 0.3, 6, COL.rock2);
      g.frustum(x, z, 1.02, 0.14, 1.72, 0.11, 6, COL.rock);
      g.frustum(x, z, 1.72, 0.32, 1.8, 0.32, 6, COL.rock2);
      glowG.frustum(x, z, 1.8, 0.25, 2.3, 0.25, 6, COL.lantern);
      g.frustum(x, z, 2.3, 0.33, 2.52, 0, 6, COL.board);
    }
  }

  private rock(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
    const rot = R() * TAU, n = 5 + Math.floor(R() * 3), c = shade(R() < 0.5 ? COL.rock : COL.rock2, 0.92 + R() * 0.16);
    g.frustum(x, z, y, s, y + s * 0.55, s * 0.84, n, c, c, rot);
    g.frustum(x, z, y + s * 0.55, s * 0.84, y + s * 0.95, s * 0.42, n, shade(c, 1.08), shade(c, 1.14), rot);
  }

  /** The board: a raised honeycomb of cupped tiles, the sloped gutter around it, the ramp and the tray. */
  private buildBoard(g: Geo, R: Rng) {
    // Each hole sits in its own hexagonal tile; tiles lighten towards the centre of the board.
    const AP = HD / 2, NC = 18, RIM = 0.47, FLOOR = 0.3, DEEP = BT - 0.13, FOOT = 0.98, s60 = Math.PI / 3;
    const edgeR = (a: number) => AP / Math.cos(((((a + s60 / 2) % s60) + s60) % s60) - s60 / 2);
    CELLS.forEach((cell, i) => {
      const x = holeX(i), z = holeZ(i), P = (a: number, r: number, y: number): Vec3 => [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
      const ringNo = (Math.abs(cell.q) + Math.abs(cell.r) + Math.abs(cell.q + cell.r)) / 2;
      const top = shade(mix(COL.tileIn, COL.tileOut, ringNo / 4), 0.965 + R() * 0.07);
      for (let n = 0; n < NC; n++) {
        const a0 = Math.PI / 6 + (n / NC) * TAU, a1 = Math.PI / 6 + ((n + 1) / NC) * TAU;
        g.quad(P(a0, RIM, BT), P(a1, RIM, BT), P(a1, edgeR(a1), BT), P(a0, edgeR(a0), BT), top, 'up');
        g.quad(P(a0, RIM, BT), P(a1, RIM, BT), P(a1, FLOOR, DEEP), P(a0, FLOOR, DEEP), COL.dish, 'up');
        g.tri([x, DEEP, z], P(a0, FLOOR, DEEP), P(a1, FLOOR, DEEP), COL.pit, 'up');
      }
      // a wall under every edge that has no neighbour: the honeycomb stands proud of the gutter
      for (let d = 0; d < 6; d++) {
        if (NB[i][d] >= 0) continue;
        const v = dirVec(d), a = Math.atan2(v[1], v[0]), r = AP / Math.cos(Math.PI / 6);
        g.quad(P(a - Math.PI / 6, r, FOOT), P(a + Math.PI / 6, r, FOOT), P(a + Math.PI / 6, r, BT), P(a - Math.PI / 6, r, BT), COL.board, [x, 1.3, z]);
      }
    });
    g.torus(0.55, 0.035, 24, 4, COL.trim, BT + 0.004); // gold inlay round the centre hole

    // sloped gutter around the honeycomb, open at angle 0 where the ramp starts
    const NG = 96, Pp = (a: number, r: number, y: number): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];
    for (let k = 0; k < NG; k++) {
      const a0 = -Math.PI + (k / NG) * TAU, a1 = -Math.PI + ((k + 1) / NG) * TAU, am = (a0 + a1) / 2;
      const h0 = floorH(a0), h1 = floorH(a1);
      const ri0 = hexR(a0, 5.2), ri1 = hexR(a1, 5.2), ro0 = hexR(a0, 7.4), ro1 = hexR(a1, 7.4), rr0 = hexR(a0, 7.66), rr1 = hexR(a1, 7.66);
      g.quad(Pp(a0, ri0, h0), Pp(a1, ri1, h1), Pp(a1, ro1, h1), Pp(a0, ro0, h0), COL.gutter, 'up');
      if (Math.abs(am) > 0.09) {
        g.quad(Pp(a0, ro0, h0), Pp(a1, ro1, h1), Pp(a1, ro1, 1.66), Pp(a0, ro0, 1.66), COL.board, [Math.cos(am) * 40, 1.3, Math.sin(am) * 40]);
        g.quad(Pp(a0, ro0, 1.66), Pp(a1, ro1, 1.66), Pp(a1, rr1, 1.66), Pp(a0, rr0, 1.66), COL.trim, 'up');
        g.quad(Pp(a0, rr0, 0.8), Pp(a1, rr1, 0.8), Pp(a1, rr1, 1.66), Pp(a0, rr0, 1.66), COL.board, [0, 1.2, 0]);
      } else {
        g.quad(Pp(a0, ro0, 0.8), Pp(a1, ro1, 0.8), Pp(a1, ro1, h1), Pp(a0, ro0, h0), COL.board, [0, 1.0, 0]);
      }
    }
    // short ramp from the gutter's low point into the tray
    g.box(8.0, 0.905, 0, 1.3, 0.21, 1.3, COL.gutter);
    g.box(8.0, 1.12, 0.69, 1.3, 0.22, 0.1, COL.trim);
    g.box(8.0, 1.12, -0.69, 1.3, 0.22, 0.1, COL.trim);
    // collection tray: Pearl row nearer the board, Coral row behind it, a dimple for each of the six marbles
    g.box(9.75, 0.9, 0, 2.4, 0.2, 6.8, COL.tray);
    for (const zs of [1, -1]) {
      g.box(9.75, 1.12, zs * 3.4, 2.52, 0.24, 0.12, COL.trim);
      g.box(8.55, 1.12, zs * 2.07, 0.12, 0.24, 2.78, COL.trim);
    }
    g.box(10.95, 1.12, 0, 0.12, 0.24, 6.8, COL.trim);
    g.box(9.75, 1.03, 0, 0.05, 0.06, 6.6, COL.trim);
    for (const owner of ['X', 'O'] as const) {
      for (let slot = 0; slot < WIN_PUSHES; slot++) {
        const p = trayPos(owner, slot);
        g.frustum(p[0], p[2], 1.0, 0.37, 1.012, 0.34, 14, COL.pit, COL.pit);
      }
    }
  }

  private palm(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
    const lean = R() * TAU;
    let lx = Math.cos(lean) * 0.18 * s, lz = Math.sin(lean) * 0.18 * s, cx = x, cz = z, cy = y;
    for (let k = 0; k < 6; k++) {
      const nx = cx + lx, nz = cz + lz, ny = cy + 0.75 * s;
      g.frustum((cx + nx) / 2, (cz + nz) / 2, cy, 0.2 * s * (1 - k * 0.06), ny, 0.17 * s * (1 - k * 0.06), 6, COL.trunk);
      cx = nx;
      cz = nz;
      cy = ny;
      lx *= 1.15;
      lz *= 1.15;
    }
    // fronds in two segments: they lift out of the crown, then droop
    for (let f = 0; f < 8; f++) {
      const ry = (f / 8) * TAU + R(), L = 2.3 * s, c = f % 2 ? COL.palm : COL.palm2, dx = Math.cos(ry), dz = -Math.sin(ry);
      g.box(cx + dx * L * 0.27, cy + L * 0.055, cz + dz * L * 0.27, L * 0.56, 0.07, 0.5 * s, c, ry, 0.2);
      g.box(cx + dx * L * 0.79, cy - L * 0.045, cz + dz * L * 0.79, L * 0.6, 0.06, 0.34 * s, shade(c, 1.08), ry, -0.55);
    }
  }

  // ---------------------------------------------------------------- state

  setView(next: TidepoolView) {
    const prev = this.view, now = performance.now();
    if (!prev || prev.gameId !== next.gameId) {
      // New board: every marble jumps to its place, the tray starts empty.
      this.anims.clear();
      this.tray.clear();
    } else if (next.moveCount !== prev.moveCount && next.last) {
      const { shifts, off, move } = next.last;
      for (const s of shifts) {
        this.anims.set(s.id, { kind: 'step', from: cellPos(s.from), to: cellPos(s.to), t0: now + (s.pushed ? 60 : 0), arc: s.pushed ? 0 : 0.3 });
      }
      if (off) {
        const owner = next.owners[off.id];
        this.tray.set(off.id, trayPos(owner, off.slot));
        this.anims.set(off.id, pathAnim(offPath(off.from, move.dir, owner, off.slot), now + 80));
      }
    }
    this.markerPos = next.moves.map((m) => {
      if (m.lead >= 0) return cellPos(NB[m.lead][m.dir]);
      let cx = 0, cz = 0;
      for (const c of m.group) {
        cx += holeX(c);
        cz += holeZ(c);
      }
      const v = dirVec(m.dir);
      return [cx / m.group.length + v[0], MY, cz / m.group.length + v[1]];
    });
    this.gemY = next.moves.map((m) => MY + (m.lead >= 0 && next.board[NB[m.lead][m.dir]] ? 0.95 : 0.3));
    this.hoverMarker = -1;
    this.shadowsUntil = now + SHADOW_MS; // pieces animate for a while after every change
    this.view = next;
  }

  // ---------------------------------------------------------------- input

  /** Point the camera orbits. It sits below the board so the board clears the bottom HUD, taller on portrait screens. */
  private focus(): THREE.Vector3 {
    return this.cam.target.clone().setY(this.cam.target.y - (this.camera.aspect < 0.8 ? PORTRAIT_DROP : LANDSCAPE_DROP));
  }

  private eye(): THREE.Vector3 {
    const c = this.cam, cp = Math.cos(c.pitch), f = this.focus();
    // On portrait screens the horizontal field of view is narrow: back off so the board still fits.
    const halfH = Math.tan(FOV / 2) * this.camera.aspect;
    const dist = c.dist * Math.max(1, BOARD_FIT / halfH / DEFAULT_DIST);
    return new THREE.Vector3(f.x + dist * cp * Math.sin(c.yaw), f.y + dist * Math.sin(c.pitch), f.z + dist * cp * Math.cos(c.yaw));
  }

  /**
   * Marker or hole under the pointer, found where the ray crosses the plane through the marble centres. A marker
   * also answers to its diamond, which floats above that plane.
   */
  pick(clientX: number, clientY: number): TidepoolPick {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return { kind: 'cell', cell: -1 };
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, 1 - ((clientY - r.top) / r.height) * 2);
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin: e, direction: d } = this.raycaster.ray;
    if (d.y > -1e-4) return { kind: 'cell', cell: -1 };
    const k = (MY - e.y) / d.y, px = e.x + d.x * k, pz = e.z + d.z * k;
    let bm = -1, bmd = 0.56;
    this.markerPos.forEach((m, i) => {
      const kg = (this.gemY[i] - e.y) / d.y;
      const dd = Math.min(Math.hypot(m[0] - px, m[2] - pz), Math.hypot(m[0] - (e.x + d.x * kg), m[2] - (e.z + d.z * kg)) + 0.12);
      if (dd < bmd) {
        bmd = dd;
        bm = i;
      }
    });
    if (bm >= 0) return { kind: 'move', index: bm };
    let bc = -1, bcd = 0.64;
    CELLS.forEach((_, i) => {
      const dd = Math.hypot(holeX(i) - px, holeZ(i) - pz);
      if (dd < bcd) {
        bcd = dd;
        bc = i;
      }
    });
    return { kind: 'cell', cell: bc };
  }

  /** Screen position (CSS px, relative to the canvas) of a hole — handy for tests and overlays. */
  cellScreenPosition(cell: number): { x: number; y: number } {
    const v = new THREE.Vector3(...cellPos(cell)).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  /** Screen position of the gold marker for move `index` of the current view. */
  markerScreenPosition(index: number): { x: number; y: number } | null {
    const p = this.markerPos[index];
    if (!p) return null;
    const v = new THREE.Vector3(...p).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  private bindInput() {
    const c = this.canvas;
    let drag: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
    const clampPitch = (p: number) => Math.min(1.4, Math.max(0.2, p));
    const onDown = (ev: PointerEvent) => {
      drag = { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY, moved: false };
      this.dragging = true;
      try { c.setPointerCapture(ev.pointerId); } catch { /* not capturable */ }
      this.lastInteract = performance.now();
    };
    const onMove = (ev: PointerEvent) => {
      if (drag) {
        const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
        drag.x = ev.clientX;
        drag.y = ev.clientY;
        if (Math.abs(ev.clientX - drag.sx) + Math.abs(ev.clientY - drag.sy) > 6) drag.moved = true;
        if (drag.moved) {
          c.style.cursor = 'grabbing';
          this.cam.yaw -= dx * 0.006;
          this.cam.pitch = clampPitch(this.cam.pitch + dy * 0.005);
        }
        this.lastInteract = performance.now();
      } else {
        const v = this.view, h: TidepoolPick = v?.interactive ? this.pick(ev.clientX, ev.clientY) : { kind: 'cell', cell: -1 };
        this.hoverMarker = h.kind === 'move' ? h.index : -1;
        this.hoverCell = h.kind === 'cell' && h.cell >= 0 && v!.board[h.cell] === v!.turn ? h.cell : -1;
        c.style.cursor = this.hoverMarker >= 0 || this.hoverCell >= 0 ? 'pointer' : 'grab';
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (drag && !drag.moved && this.view?.interactive) this.onPick(this.pick(ev.clientX, ev.clientY));
      drag = null;
      this.dragging = false;
      c.style.cursor = 'grab';
    };
    const onLeave = () => {
      if (!drag) {
        this.hoverCell = -1;
        this.hoverMarker = -1;
      }
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      this.cam.dist = Math.min(40, Math.max(9, this.cam.dist * (1 + ev.deltaY * 0.001)));
      this.lastInteract = performance.now();
    };
    const add = (type: string, fn: EventListener, opts: AddEventListenerOptions | boolean = false) => {
      c.addEventListener(type, fn, opts);
      this.handlers.push([type, fn, opts]);
    };
    add('pointerdown', onDown as EventListener);
    add('pointermove', onMove as EventListener);
    add('pointerup', onUp as EventListener);
    add('pointercancel', onUp as EventListener);
    add('pointerleave', onLeave);
    add('wheel', onWheel as EventListener, { passive: false });
  }

  // ---------------------------------------------------------------- frame

  private resize() {
    const c = this.canvas;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75) * this.budget.scale);
    this.renderer.setSize(Math.max(1, c.clientWidth), Math.max(1, c.clientHeight), false);
    this.camera.aspect = Math.max(1, c.clientWidth) / Math.max(1, c.clientHeight);
    this.camera.updateProjectionMatrix();
  }

  /** Current position of a marble: its resting place, or where its animation has carried it. */
  private marblePos(id: number, rest: Vec3, now: number): Vec3 {
    const a = this.anims.get(id);
    if (!a) return rest;
    if (a.kind === 'path') {
      const tt = (now - a.t0) / 1000;
      if (tt <= 0) return a.pts[0];
      const sd = 2.5 * tt + 6 * tt * tt; // rolls faster and faster down the gutter
      if (sd >= a.total) {
        this.anims.delete(id);
        return rest;
      }
      let k = 1;
      while (k < a.L.length - 1 && a.L[k] < sd) k++;
      const f = (sd - a.L[k - 1]) / (a.L[k] - a.L[k - 1] || 1), A = a.pts[k - 1], B = a.pts[k];
      return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f];
    }
    const t = (now - a.t0) / STEP_MS;
    if (t <= 0) return a.from;
    if (t >= 1) {
      this.anims.delete(id);
      return rest;
    }
    const e = t * t * (3 - 2 * t);
    return [a.from[0] + (a.to[0] - a.from[0]) * e, a.from[1] + (a.to[1] - a.from[1]) * e + Math.sin(t * Math.PI) * a.arc, a.from[2] + (a.to[2] - a.from[2]) * e];
  }

  private frame() {
    const now = performance.now(), t = (now - this.clock0) / 1000;
    const dt = Math.min(0.05, (now - (this.lastT || now)) / 1000);
    if (this.budget.tick((now - (this.lastT || now)) / 1000, now)) this.resize(); // slow frames: lower the resolution
    this.lastT = now;
    if (this.autoRotate && !this.dragging && now - this.lastInteract > IDLE_ROTATE_MS) this.cam.yaw += dt * 0.04;

    this.camera.position.copy(this.eye());
    this.camera.lookAt(this.focus());
    this.sky.position.copy(this.camera.position);
    this.sky.material.uniforms.uTime.value = t;
    this.water.material.uniforms.uTime.value = t;

    const v = this.view, pulse = 0.5 + 0.5 * Math.sin(t * 5);

    // last move: dim gold rings round the holes of the marbles that just moved
    const landed = v?.last?.landed ?? [];
    this.lastRings.forEach((ring, i) => {
      ring.visible = i < landed.length && !v!.sel.includes(landed[i]);
      if (ring.visible) ring.position.set(holeX(landed[i]), BT + 0.02, holeZ(landed[i]));
    });
    // selection: bright rings that breathe under the lifted marbles
    this.selRings.forEach((ring, i) => {
      const cell = v?.sel[i];
      ring.visible = cell !== undefined;
      if (!ring.visible) return;
      ring.position.set(holeX(cell!), BT + 0.03, holeZ(cell!));
      ring.scale.setScalar(1 + 0.05 * pulse);
      this.glow(ring.material, COL.gold, 0.75 + 0.2 * pulse);
    });

    // marbles: on the board at their hole, otherwise in the tray
    const cellOf = new Map<number, number>();
    v?.ids.forEach((id, cell) => { if (id >= 0) cellOf.set(id, cell); });
    this.marbles.forEach((mesh, id) => {
      const owner = v?.owners[id];
      const cell = cellOf.get(id) ?? -1;
      const rest = cell >= 0 ? cellPos(cell) : this.tray.get(id);
      mesh.visible = !!owner && !!rest;
      if (!mesh.visible) return;
      const m = mesh.material, base = COL[owner!];
      if (this.marbleOwner[id] !== owner) {
        // Pearl: soft sheen with a trace of iridescence. Coral: a deeper, wetter gloss.
        this.marbleOwner[id] = owner;
        m.color.setRGB(base[0], base[1], base[2]);
        m.roughness = owner === 'X' ? 0.2 : 0.14;
        m.envMapIntensity = owner === 'X' ? 0.7 : 1.1;
        m.iridescence = owner === 'X' ? 0.45 : 0;
        m.iridescenceIOR = 1.25;
        m.needsUpdate = true;
      }
      let p = this.marblePos(id, rest!, now);
      if (cell >= 0 && v!.sel.includes(cell)) {
        const e = 0.2 + 0.1 * pulse;
        m.emissive.setRGB(COL.gold[0] * e, COL.gold[1] * e, COL.gold[2] * e * 0.8);
        p = [p[0], p[1] + 0.2, p[2]];
      } else if (cell >= 0 && cell === this.hoverCell && v!.interactive) {
        m.emissive.setRGB(base[0] * 0.14, base[1] * 0.14, base[2] * 0.14);
      } else {
        m.emissive.setRGB(0, 0, 0);
      }
      mesh.position.set(p[0], p[1], p[2]);
    });

    // move markers: a ring on the board where the selection would go, and a diamond turning above it
    this.gems.forEach((gem, i) => {
      const p = this.markerPos[i], ring = this.markRings[i];
      gem.visible = ring.visible = !!p && !!v?.interactive;
      if (!gem.visible) return;
      const hov = i === this.hoverMarker, s = hov ? 1.35 : 1, e = hov ? 0.95 : 0.6 + 0.25 * pulse;
      gem.position.set(p[0], this.gemY[i] + 0.07 * Math.sin(t * 4 + i), p[2]);
      gem.rotation.y = t * 1.6 + i;
      gem.scale.setScalar(s);
      this.glow(gem.material, COL.gold, e);
      ring.position.set(p[0], BT + 0.03, p[2]);
      ring.scale.setScalar(hov ? 1.08 : 0.92 + 0.06 * pulse);
      this.glow(ring.material, COL.gold, e);
    });

    // sky lanterns: rise, sway and spin, fading in near the water
    const o = new THREE.Object3D();
    this.lanternData.forEach((L, j) => {
      const cyc = (t * L.sp + L.ph) % 1;
      const ls = L.s * Math.min(1, cyc * 12);
      o.position.set(L.x + Math.sin(t * 0.4 + L.sw) * (1 + cyc * 3), 0.5 + cyc * 62, L.z + Math.cos(t * 0.33 + L.sw) * (1 + cyc * 3));
      o.rotation.set(0, t * 0.2 + L.sw, 0);
      o.scale.setScalar(Math.max(ls, 1e-3));
      o.updateMatrix();
      this.lanterns.setMatrixAt(j, o.matrix);
    });
    this.lanterns.instanceMatrix.needsUpdate = true;
    // water lanterns: drift slowly round the lagoon, bobbing on the ripples
    this.floatData.forEach((F, j) => {
      const a = F.a + t * 0.006;
      o.position.set(Math.cos(a) * F.r, 0.03 + 0.05 * Math.sin(t * 1.1 + F.ph), Math.sin(a) * F.r);
      o.rotation.set(0.05 * Math.sin(t * 0.9 + F.ph), F.ph, 0.05 * Math.cos(t * 0.8 + F.ph));
      o.scale.setScalar(F.s);
      o.updateMatrix();
      this.floats.setMatrixAt(j, o.matrix);
    });
    this.floats.instanceMatrix.needsUpdate = true;

    this.renderer.shadowMap.needsUpdate = performance.now() < this.shadowsUntil;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    for (const [type, fn, opts] of this.handlers) this.canvas.removeEventListener(type, fn, opts);
    const geos = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) geos.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => mats.add(m));
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    this.env.dispose();
    this.renderer.dispose();
    // See SceneController.dispose: only a detached canvas may lose its context.
    if (!this.canvas.isConnected) this.renderer.forceContextLoss();
  }
}
