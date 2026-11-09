/**
 * three.js scene for Tidepool: a dusk lagoon with palm islands, a stone platform, the hexagonal board with its
 * sloped gutter, the ramp and the collection tray, and floating sky lanterns. Ported from the design's Tidepool
 * artboard. Like the other controllers it holds no game state of its own: it receives a view, and animates
 * marbles from the last move the view reports.
 */
import * as THREE from 'three';
import type { Cell, Player } from '../game/types';
import { CELLS, NB, type Move, type MoveResult } from '../tidepool/rules';
import { Geo, hexRgb, type RGB, type Vec3 } from './geometry';
import { skyMaterial, waterMaterial } from './shaders';
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
  light: { sun: [1.0, 0.86, 0.7] as RGB, sky: [0.45, 0.55, 0.66] as RGB, gnd: [0.22, 0.22, 0.2] as RGB },
  water: hexRgb('#2f8f9a'),
  sand: hexRgb('#d6c39a'), grass: hexRgb('#3f7a55'), grass2: hexRgb('#4f8a5a'), rock: hexRgb('#4f6470'), rock2: hexRgb('#6b8090'),
  trunk: hexRgb('#7a5a3e'), palm: hexRgb('#3f8a4f'), palm2: hexRgb('#2f7346'),
  board: hexRgb('#2a4a5e'), boardTop: hexRgb('#35596f'), pit: hexRgb('#16303f'), trim: hexRgb('#d6ad6c'), tray: hexRgb('#1f3346'),
  X: hexRgb('#f1ece2'), O: hexRgb('#ff6f5e'), gold: hexRgb('#ffd27a'), lantern: hexRgb('#ffb45a'),
};
const LIGHT_DIR = new THREE.Vector3(-0.35, 0.7, -0.6).normalize();
const FOG_DENSITY = 0.0068;
const FOV = 0.85; // radians, as in the design
const DEFAULT_DIST = 17.5;
/** Half-width (world units) that must stay visible on narrow screens: the board, gutter and tray. */
const BOARD_FIT = 8.4;
const PORTRAIT_DROP = 1.6;
const IDLE_ROTATE_MS = 7000;
const STEP_MS = 300;

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
const trayPos = (owner: Player, slot: number): Vec3 => [owner === 'X' ? 9.2 : 10.2, 1.1, -2.5 + slot * 1.0];
// gutter around the board: highest on the far left, sloping down to the ramp at angle 0
const GUT_V = 6.95;
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
  pts.push(gutPt(0), [7.5, 1.45, 0], [8.7, 1.12, 0], trayPos(owner, slot));
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

type LitMaterial = THREE.MeshLambertMaterial | THREE.MeshPhongMaterial;
type LambertMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;

export class TidepoolController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private clock0 = performance.now();
  private raf = 0;
  private lastT = 0;
  private resizeObs: ResizeObserver;
  private handlers: [string, EventListener, AddEventListenerOptions | boolean][] = [];

  private cam = { yaw: 0, pitch: 0.92, dist: DEFAULT_DIST, target: new THREE.Vector3(0, 1.4, 0) };
  private lastInteract = performance.now();
  private dragging = false;
  private hoverCell = -1;
  private hoverMarker = -1;

  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private water!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private marbleGeo!: Record<Player, THREE.BufferGeometry>;
  private marbles: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>[] = [];
  private markers: LambertMesh[] = [];
  private rings: LambertMesh[] = [];
  private lanterns!: THREE.InstancedMesh;
  private lanternData: { x: number; z: number; ph: number; sp: number; sw: number; s: number }[] = [];

  private view: TidepoolView | null = null;
  /** Resting place of each marble id that has left the board. */
  private tray = new Map<number, Vec3>();
  private anims = new Map<number, Anim>();
  private markerPos: Vec3[] = [];
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
    sun.position.copy(LIGHT_DIR);
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

    this.scene.add(new THREE.Mesh(this.buildWorld().toGeometry(), this.lambert()));

    const S = 340, wg = new THREE.PlaneGeometry(S * 2, S * 2).rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, waterMaterial({
      base: COL.water, light: LIGHT_DIR.toArray(), sunCol: COL.light.sun, skyCol: COL.light.sky, gndCol: COL.light.gnd,
      fog: COL.sky.fog, fogDensity: FOG_DENSITY, spec: 1.2,
    }));
    this.scene.add(this.water);

    const sphere = (c: RGB) => {
      const g = new Geo();
      g.sphere(0.5, 20, 12, c);
      return g.toGeometry();
    };
    this.marbleGeo = { X: sphere(COL.X), O: sphere(COL.O) };
    for (let id = 0; id < 28; id++) {
      // Glossy marbles: the design adds a tight specular highlight and a soft rim on them only.
      const mesh = new THREE.Mesh(this.marbleGeo.X, new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x8a7f70, shininess: 28 }));
      mesh.visible = false;
      this.marbles.push(mesh);
      this.scene.add(mesh);
    }

    const markerGeo = new Geo();
    markerGeo.frustum(0, 0, 0, 0.36, 0.06, 0.32, 18, COL.gold, COL.gold);
    const mg = markerGeo.toGeometry();
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(mg, this.lambert());
      m.visible = false;
      this.markers.push(m);
      this.scene.add(m);
    }
    const ringGeo = new Geo();
    ringGeo.frustum(0, 0, 0, 0.62, 0.04, 0.62, 24, COL.gold, COL.gold);
    const rg = ringGeo.toGeometry();
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(rg, this.glow(this.lambert(), COL.gold, 0.4, [0.6, 0.6, 0.6]));
      m.visible = false;
      this.rings.push(m);
      this.scene.add(m);
    }

    const lg = new Geo();
    lg.frustum(0, 0, 0, 0.3, 0.75, 0.42, 6, COL.lantern, COL.lantern);
    const R = rng(31);
    for (let k = 0; k < 20; k++) {
      const a = R() * Math.PI * 2, r = 13 + R() * 40;
      this.lanternData.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ph: R(), sp: 0.01 + R() * 0.012, sw: R() * 6, s: 0.6 + R() * 0.5 });
    }
    this.lanterns = new THREE.InstancedMesh(lg.toGeometry(), this.glow(this.lambert(), COL.lantern, 0.95), this.lanternData.length);
    this.lanterns.frustumCulled = false;
    this.scene.add(this.lanterns);
  }

  /** Design's emission: colour = mix(lit, base·1.35, e) → scale diffuse by (1−e), add base·1.35·e. */
  private glow<M extends LitMaterial>(m: M, base: RGB, e: number, tint: RGB = [1, 1, 1]): M {
    m.color.setRGB(tint[0] * (1 - e), tint[1] * (1 - e), tint[2] * (1 - e));
    m.emissive.setRGB(base[0] * tint[0] * 1.35 * e, base[1] * tint[1] * 1.35 * e, base[2] * tint[2] * 1.35 * e);
    return m;
  }

  private buildWorld(): Geo {
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
      const k = 0.94 + R() * 0.12;
      return [c[0] * k, c[1] * k, c[2] * k];
    };
    for (let jj = 0; jj < N; jj++) {
      for (let ii = 0; ii < N; ii++) {
        const a = H[jj * (N + 1) + ii], b = H[jj * (N + 1) + ii + 1], c = H[(jj + 1) * (N + 1) + ii + 1], d = H[(jj + 1) * (N + 1) + ii];
        if (Math.max(a[1], b[1], c[1]) > -0.8) g.tri(a, b, c, tcol(a, b, c), 'up');
        if (Math.max(a[1], c[1], d[1]) > -0.8) g.tri(a, c, d, tcol(a, c, d), 'up');
      }
    }
    // palms on the sandy islands around the lagoon
    let placed = 0;
    for (let t = 0; t < 1500 && placed < 90; t++) {
      const ang = R() * Math.PI * 2, rr = 26 + R() * 18;
      const px = Math.cos(ang) * rr, pz = Math.sin(ang) * rr, ph = lagoonTerrainH(px, pz);
      if (ph < 0.6 || ph > 8) continue;
      this.palm(g, px, ph - 0.2, pz, 0.9 + R() * 0.7, R);
      placed++;
    }
    // stone platform
    g.frustum(0, 0, -4.5, 13.4, 0.2, 12.0, 12, COL.rock, COL.rock, 0.2);
    g.frustum(0, 0, 0.2, 12.0, 0.9, 11.6, 12, COL.sand, COL.sand, 0.2);
    [[10.6, 5.2, 1.1], [-10.4, -4.0, 1.0], [2.0, -10.8, 0.9], [-6.0, 9.0, 1.2]].forEach((bd, k) =>
      g.box(bd[0], 0.6, bd[1], bd[2] * 1.4, bd[2], bd[2] * 1.2, COL.rock2, k * 0.9));
    this.palm(g, 9.4, 0.8, -6.6, 0.8, R);
    this.palm(g, -10.2, 0.8, 2.4, 0.7, R);
    // hex board and its holes
    g.frustum(0, 0, 0.9, 6.5, 1.55, 6.3, 6, COL.board, COL.boardTop);
    g.frustum(0, 0, 1.5, 6.42, 1.6, 6.36, 6, COL.trim, COL.boardTop);
    CELLS.forEach((_, i) => g.frustum(holeX(i), holeZ(i), 1.6, 0.47, BT, 0.43, 14, COL.pit, COL.pit));
    // sloped gutter around the board, open at angle 0 where the ramp starts
    const NG = 96, Pp = (a: number, r: number, y: number): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];
    for (let k = 0; k < NG; k++) {
      const a0 = -Math.PI + (k / NG) * 2 * Math.PI, a1 = -Math.PI + ((k + 1) / NG) * 2 * Math.PI, am = (a0 + a1) / 2;
      const h0 = floorH(a0), h1 = floorH(a1);
      const ri0 = hexR(a0, 6.3), ri1 = hexR(a1, 6.3), ro0 = hexR(a0, 7.4), ro1 = hexR(a1, 7.4), rr0 = hexR(a0, 7.62), rr1 = hexR(a1, 7.62);
      g.quad(Pp(a0, ri0, h0), Pp(a1, ri1, h1), Pp(a1, ro1, h1), Pp(a0, ro0, h0), COL.pit, 'up');
      if (Math.abs(am) > 0.09) {
        g.quad(Pp(a0, ro0, h0), Pp(a1, ro1, h1), Pp(a1, ro1, 1.66), Pp(a0, ro0, 1.66), COL.board, [Math.cos(am) * 40, 1.3, Math.sin(am) * 40]);
        g.quad(Pp(a0, ro0, 1.66), Pp(a1, ro1, 1.66), Pp(a1, rr1, 1.66), Pp(a0, rr0, 1.66), COL.trim, 'up');
        g.quad(Pp(a0, rr0, 0.9), Pp(a1, rr1, 0.9), Pp(a1, rr1, 1.66), Pp(a0, rr0, 1.66), COL.board, [0, 1.2, 0]);
      } else {
        g.quad(Pp(a0, ro0, 0.9), Pp(a1, ro1, 0.9), Pp(a1, ro1, h1), Pp(a0, ro0, h0), COL.board, [0, 1.0, 0]);
      }
    }
    // ramp down to the collection tray
    g.box(8.0, 0.5, 0, 1.3, 0.5, 1.0, COL.board);
    g.box(8.0, 0.77, 0, 1.5, 0.08, 1.2, COL.boardTop, 0, -0.265);
    g.box(8.0, 0.92, 0.64, 1.5, 0.14, 0.08, COL.trim, 0, -0.265);
    g.box(8.0, 0.92, -0.64, 1.5, 0.14, 0.08, COL.trim, 0, -0.265);
    // collection tray: Pearl row nearer the board, Coral row behind it
    g.box(9.7, 0.45, 0, 2.3, 0.3, 6.6, COL.tray);
    g.box(9.7, 0.66, 3.3, 2.42, 0.14, 0.12, COL.trim);
    g.box(9.7, 0.66, -3.3, 2.42, 0.14, 0.12, COL.trim);
    g.box(8.55, 0.66, 0, 0.12, 0.14, 6.6, COL.trim);
    g.box(10.85, 0.66, 0, 0.12, 0.14, 6.6, COL.trim);
    g.box(9.7, 0.64, 0, 0.06, 0.1, 6.4, COL.trim);
    return g;
  }

  private palm(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
    const lean = R() * Math.PI * 2;
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
    for (let f = 0; f < 7; f++) {
      const ry = (f / 7) * Math.PI * 2 + R(), L = 2.2 * s;
      g.box(cx + Math.cos(ry) * L * 0.45, cy - 0.2 * s, cz - Math.sin(ry) * L * 0.45, L, 0.07, 0.55 * s, f % 2 ? COL.palm : COL.palm2, ry, -0.35);
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
    this.hoverMarker = -1;
    this.view = next;
  }

  // ---------------------------------------------------------------- input

  /** Point the camera orbits. On portrait screens it drops so the board sits above the taller bottom HUD. */
  private focus(): THREE.Vector3 {
    return this.cam.target.clone().setY(this.cam.target.y - (this.camera.aspect < 0.8 ? PORTRAIT_DROP : 0));
  }

  private eye(): THREE.Vector3 {
    const c = this.cam, cp = Math.cos(c.pitch), f = this.focus();
    // On portrait screens the horizontal field of view is narrow: back off so the board still fits.
    const halfH = Math.tan(FOV / 2) * this.camera.aspect;
    const dist = c.dist * Math.max(1, BOARD_FIT / halfH / DEFAULT_DIST);
    return new THREE.Vector3(f.x + dist * cp * Math.sin(c.yaw), f.y + dist * Math.sin(c.pitch), f.z + dist * cp * Math.cos(c.yaw));
  }

  /** Marker or hole under the pointer, found where the ray crosses the plane through the marble centres. */
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
      const dd = Math.hypot(m[0] - px, m[2] - pz);
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
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
    this.lastT = now;
    if (this.autoRotate && !this.dragging && now - this.lastInteract > IDLE_ROTATE_MS) this.cam.yaw += dt * 0.04;

    this.camera.position.copy(this.eye());
    this.camera.lookAt(this.focus());
    this.sky.position.copy(this.camera.position);
    this.sky.material.uniforms.uTime.value = t;
    this.water.material.uniforms.uTime.value = t;

    const v = this.view, pulse = 0.5 + 0.5 * Math.sin(t * 5);

    // last move: dim gold rings under the marbles that just moved
    const landed = v?.last?.landed ?? [];
    this.rings.forEach((ring, i) => {
      ring.visible = i < landed.length;
      if (ring.visible) ring.position.set(holeX(landed[i]), BT + 0.01, holeZ(landed[i]));
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
      let p = this.marblePos(id, rest!, now), em = 0, tint: RGB = [1, 1, 1];
      if (cell >= 0 && v!.sel.includes(cell)) {
        em = 0.25 + 0.15 * pulse;
        tint = [1.05, 1.0, 0.82];
        p = [p[0], p[1] + 0.18, p[2]];
      } else if (cell >= 0 && cell === this.hoverCell && v!.interactive) {
        em = 0.15;
      }
      mesh.geometry = this.marbleGeo[owner!];
      mesh.position.set(p[0], p[1], p[2]);
      this.glow(mesh.material, COL[owner!], em, tint);
    });

    // gold markers bob above the holes the selection can move to
    this.markers.forEach((mk, i) => {
      const p = this.markerPos[i];
      mk.visible = !!p && !!v?.interactive;
      if (!mk.visible) return;
      const hov = i === this.hoverMarker, s = hov ? 1.25 : 1;
      mk.position.set(p[0], MY + 0.55 + 0.08 * Math.sin(t * 4 + i), p[2]);
      mk.scale.set(s, 1, s);
      this.glow(mk.material, COL.gold, hov ? 0.9 : 0.6 + 0.2 * pulse);
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

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    for (const [type, fn, opts] of this.handlers) this.canvas.removeEventListener(type, fn, opts);
    const geos = new Set<THREE.BufferGeometry>(Object.values(this.marbleGeo)), mats = new Set<THREE.Material>();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) geos.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => mats.add(m));
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    this.renderer.dispose();
    // See SceneController.dispose: only a detached canvas may lose its context.
    if (!this.canvas.isConnected) this.renderer.forceContextLoss();
  }
}
