/**
 * three.js scene for Canopy: a forest clearing at dawn with a mossy stone platform, the 5×5 wooden board, the
 * trees that grow on its tiles, the climbers, their lanterns and drifting fireflies. Ported from the design's
 * Canopy artboard, with the growth stages redrawn as real trees (`trees.ts`). Like the other controllers it
 * holds no game state of its own: it receives a view, and animates from the last action the view reports.
 */
import * as THREE from 'three';
import type { Cell, Player } from '../game/types';
import { BLOSSOM, CELL_COUNT, colOf, ownerOf, rowOf, SIZE, TREETOP, type LastAction, type Phase } from '../canopy/rules';
import { Geo, hexRgb, type RGB, type Vec3 } from './geometry';
import { skyMaterial } from './shaders';
import { FOREST_SUN, forestTerrainH, hash2, rng } from './terrain';
import { BLOSSOM_TOP, bush, CROWN_BASE, forestTree, growthStage, LEVEL_H, pine } from './trees';

export interface CanopyView {
  level: number[];
  lantern: Cell[];
  climbers: number[];
  turn: Player;
  phase: Phase;
  /** The climber picked up (move phase) or the one that just stepped (grow and cut phases); −1 for none. */
  sel: number;
  /** Tiles the selection may act on; each gets a marker of the phase's kind. */
  targets: number[];
  last: LastAction | null;
  lastStep: number;
  lastGrow: number;
  lastCut: number;
  actionCount: number;
  /** Whether a human may click right now. */
  interactive: boolean;
  /** Changes on every new game so the board resets without animation. */
  gameId: number;
}

const COL = {
  sky: { top: hexRgb('#16384a'), mid: hexRgb('#4f8a86'), hor: hexRgb('#ffd9a0'), fog: hexRgb('#a7c4b0'), sun: hexRgb('#ffe6b8') },
  light: { sun: [1.0, 0.88, 0.7] as RGB, sky: [0.42, 0.55, 0.5] as RGB, gnd: [0.2, 0.22, 0.16] as RGB },
  grass: hexRgb('#4c7f45'), grass2: hexRgb('#5f9450'), hill: hexRgb('#3a6e4e'), rock: hexRgb('#5d6b66'), rock2: hexRgb('#7a8a84'),
  wood: hexRgb('#4a3626'), woodTop: hexRgb('#5e4632'), trim: hexRgb('#d6ad6c'), stone: hexRgb('#6e7a72'), stoneTop: hexRgb('#567a4a'),
  moss: hexRgb('#4f7d4a'), mossTop: hexRgb('#6a9a5a'), mossTop2: hexRgb('#5f9052'),
  petal: hexRgb('#f29ab8'), pollen: hexRgb('#ffe6b0'), cap: hexRgb('#d9a441'),
  X: hexRgb('#ffb347'), Xh: hexRgb('#ffe0a8'), O: hexRgb('#8576f5'), Oh: hexRgb('#ddd7ff'), leaf: hexRgb('#7fbf5f'),
  gold: hexRgb('#ffd27a'), sprout: hexRgb('#9be070'), axe: hexRgb('#ff8a5c'), white: [1, 1, 1] as RGB, firefly: [1.0, 0.95, 0.55] as RGB,
};
/** Lantern light of each side. */
const TINT: Record<Player, RGB> = { X: hexRgb('#ffb347'), O: hexRgb('#9a8cff') };
/** The design lights the board from behind (towards the sunrise); brought round to the side so the faces the player sees are lit. */
const LIGHT_DIR = new THREE.Vector3(0.5, 0.75, 0.2).normalize();
const FOG_DENSITY = 0.0085;
const FOV = 0.85; // radians, as in the design
const DEFAULT_DIST = 13.5;
/** Half-width (world units) that must stay visible on narrow screens: the board and its trim. */
const BOARD_FIT = 4.8;
const PORTRAIT_DROP = 1.4;
const IDLE_ROTATE_MS = 7000;
const STEP_MS = 380;
const GROW_MS = 520;
/** Different trees per stage, so neighbouring tiles do not look cloned. */
const VARIANTS = 4;
const MAX_LANTERNS = 4;

// board geometry: 5×5 tiles on a pitch of HD, top of the moss at BT
const HD = 1.25, BT = 1.6, TILE = 0.6;
const MID = (SIZE - 1) / 2;
const tileX = (i: number) => HD * (colOf(i) - MID);
const tileZ = (i: number) => HD * (rowOf(i) - MID);
/** Height a climber stands at on a tile of the given stage. */
const topY = (level: number) => BT + Math.min(level, TREETOP) * LEVEL_H;
const standPos = (i: number, level: number): Vec3 => [tileX(i), topY(level), tileZ(i)];

type LitMaterial = THREE.MeshLambertMaterial | THREE.MeshPhongMaterial;
type LambertMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;

export class CanopyController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private clock0 = performance.now();
  private raf = 0;
  private lastT = 0;
  private resizeObs: ResizeObserver;
  private handlers: [string, EventListener, AddEventListenerOptions | boolean][] = [];

  private cam = { yaw: 0, pitch: 0.8, dist: DEFAULT_DIST, target: new THREE.Vector3(0, 2.1, 0) };
  private lastInteract = performance.now();
  private dragging = false;
  private hoverCell = -1;

  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  /** stageGeo[level − 1][variant] */
  private stageGeo: THREE.BufferGeometry[][] = [];
  private trees: LambertMesh[] = [];
  private climbers: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>[] = [];
  private markerGeo!: Record<Phase, THREE.BufferGeometry>;
  private markers: LambertMesh[] = [];
  /** Halos: 0 the selected climber, 1 the last step, 2 the last grow. */
  private halos: LambertMesh[] = [];
  private lanterns: { mesh: LambertMesh; light: THREE.PointLight }[] = [];
  private fireflies!: THREE.InstancedMesh;
  private flyData: { x: number; y: number; z: number; ph: number; sp: number }[] = [];

  private view: CanopyView | null = null;
  private stepAnim = new Map<number, { from: Vec3; to: Vec3; t0: number }>();
  /** Tiles that just grew or were cut: the tree scales from `from` (relative size) back to its full size. */
  private growAnim = new Map<number, { t0: number; from: number }>();
  autoRotate = false;

  constructor(private canvas: HTMLCanvasElement, private onPick: (cell: number) => void) {
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

  /** Design's emission: colour = mix(lit, base·1.35, e) → scale diffuse by (1−e), add base·1.35·e. */
  private glow<M extends LitMaterial>(m: M, base: RGB, e: number, tint: RGB = [1, 1, 1]): M {
    m.color.setRGB(tint[0] * (1 - e), tint[1] * (1 - e), tint[2] * (1 - e));
    m.emissive.setRGB(base[0] * tint[0] * 1.35 * e, base[1] * tint[1] * 1.35 * e, base[2] * tint[2] * 1.35 * e);
    return m;
  }

  private buildScene() {
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 18),
      skyMaterial({ sun: FOREST_SUN, top: COL.sky.top, mid: COL.sky.mid, hor: COL.sky.hor, fog: COL.sky.fog, sunCol: COL.sky.sun }),
    );
    this.sky.scale.setScalar(500);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    this.scene.add(new THREE.Mesh(this.buildWorld().toGeometry(), this.lambert()));

    // the trees of the board: one mesh per tile, showing the tile's current growth stage
    for (let level = 1; level <= BLOSSOM; level++) {
      this.stageGeo.push(Array.from({ length: VARIANTS }, (_, v) => growthStage(level, v + 1).toGeometry()));
    }
    for (let i = 0; i < CELL_COUNT; i++) {
      const m = new THREE.Mesh(this.stageGeo[0][0], this.lambert());
      m.position.set(tileX(i), BT, tileZ(i));
      m.rotation.y = hash2(i * 1.7 + 3, i * 0.9 + 11) * Math.PI * 2;
      m.visible = false;
      this.trees.push(m);
      this.scene.add(m);
    }

    // climbers: a little forest sprite with a leaf on its head
    const sprite = (body: RGB, head: RGB) => {
      const g = new Geo();
      g.frustum(0, 0, 0, 0.27, 0.5, 0.18, 12, body, body);
      g.sphere(0.21, 14, 9, head, [0, 0.7, 0]);
      g.box(0.08, 0.96, 0, 0.24, 0.05, 0.12, COL.leaf, 0, 0.55);
      return g.toGeometry();
    };
    const spriteGeo: Record<Player, THREE.BufferGeometry> = { X: sprite(COL.X, COL.Xh), O: sprite(COL.O, COL.Oh) };
    for (let k = 0; k < 4; k++) {
      const mesh = new THREE.Mesh(spriteGeo[ownerOf(k)], new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x3a352e, shininess: 22 }));
      mesh.visible = false;
      this.climbers.push(mesh);
      this.scene.add(mesh);
    }

    // markers: a gold disc for "step here", a green sprout for "grow this", a coral arrow for "cut this back"
    const disc = new Geo();
    disc.frustum(0, 0, 0, 0.3, 0.06, 0.26, 18, COL.gold, COL.gold);
    const sproutGeo = new Geo();
    sproutGeo.frustum(0, 0, 0, 0.05, 0.36, 0.04, 6, COL.sprout, COL.sprout);
    sproutGeo.box(0.12, 0.36, 0, 0.24, 0.04, 0.14, COL.sprout, 0, 0.5);
    sproutGeo.box(-0.12, 0.3, 0, 0.22, 0.04, 0.13, COL.sprout, 0, -0.5);
    const arrow = new Geo();
    arrow.frustum(0, 0, 0, 0, 0.3, 0.27, 10, COL.axe, COL.axe);
    arrow.frustum(0, 0, 0.3, 0.1, 0.62, 0.1, 8, COL.axe, COL.axe);
    this.markerGeo = { move: disc.toGeometry(), grow: sproutGeo.toGeometry(), cut: arrow.toGeometry() };
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(this.markerGeo.move, this.lambert());
      m.visible = false;
      this.markers.push(m);
      this.scene.add(m);
    }

    const halo = new Geo();
    halo.torus(0.42, 0.035, 28, 6, COL.white, 0);
    const hg = halo.toGeometry();
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(hg, this.lambert());
      m.visible = false;
      this.halos.push(m);
      this.scene.add(m);
    }

    // paper lanterns: a glowing barrel with a cap, a tassel, and a small light of the owner's colour
    const lg = new Geo();
    lg.frustum(0, 0, -0.15, 0.1, 0, 0.17, 8, COL.white, COL.white);
    lg.frustum(0, 0, 0, 0.17, 0.15, 0.1, 8, COL.white, COL.white);
    lg.frustum(0, 0, 0.15, 0.07, 0.19, 0.05, 8, COL.white, COL.white);
    lg.frustum(0, 0, -0.27, 0.02, -0.15, 0.03, 5, COL.white, COL.white);
    const lanternGeo = lg.toGeometry();
    for (let i = 0; i < MAX_LANTERNS; i++) {
      const mesh = new THREE.Mesh(lanternGeo, this.lambert());
      mesh.visible = false;
      const light = new THREE.PointLight(0xffffff, 0, 4.5, 1.6);
      this.lanterns.push({ mesh, light });
      this.scene.add(mesh, light);
    }

    const fg = new Geo();
    fg.sphere(0.06, 6, 4, COL.white);
    const R = rng(17);
    for (let k = 0; k < 46; k++) {
      const a = R() * Math.PI * 2, r = 6.5 + R() * 20;
      this.flyData.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.8 + R() * 4, ph: R() * 10, sp: 0.3 + R() * 0.5 });
    }
    this.fireflies = new THREE.InstancedMesh(fg.toGeometry(), this.glow(this.lambert(), COL.firefly, 1), this.flyData.length);
    this.fireflies.frustumCulled = false;
    this.scene.add(this.fireflies);
  }

  private buildWorld(): Geo {
    const g = new Geo(), N = 130, S = 280, st = S / N, H: Vec3[] = [];
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        let x = -S / 2 + i * st, z = -S / 2 + j * st;
        if (i > 0 && i < N && j > 0 && j < N) {
          x += (hash2(i * 3.1, j * 1.7) - 0.5) * st * 0.55;
          z += (hash2(i * 1.3, j * 2.9) - 0.5) * st * 0.55;
        }
        H.push([x, forestTerrainH(x, z), z]);
      }
    }
    const R = rng(4);
    const tcol = (p: Vec3, q: Vec3, s: Vec3): RGB => {
      const h = (p[1] + q[1] + s[1]) / 3;
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = s[0] - p[0], vy = s[1] - p[1], vz = s[2] - p[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const ly = Math.abs(ny) / (Math.hypot(nx, ny, nz) || 1);
      let c: RGB;
      if (Math.hypot(p[0], p[2]) < 10) c = COL.grass2;
      else if (ly > 0.72 && h < 20) c = h < 4 ? COL.grass : COL.hill;
      else if (h > 24) c = COL.rock2;
      else c = COL.rock;
      const k = 0.93 + R() * 0.14;
      return [c[0] * k, c[1] * k, c[2] * k];
    };
    for (let jj = 0; jj < N; jj++) {
      for (let ii = 0; ii < N; ii++) {
        const a = H[jj * (N + 1) + ii], b = H[jj * (N + 1) + ii + 1], c = H[(jj + 1) * (N + 1) + ii + 1], d = H[(jj + 1) * (N + 1) + ii];
        g.tri(a, b, c, tcol(a, b, c), 'up');
        g.tri(a, c, d, tcol(a, c, d), 'up');
      }
    }
    // the forest: broadleaf trees and a few conifers ringing the clearing, thinning out up the hills
    let placed = 0;
    for (let t = 0; t < 2500 && placed < 170; t++) {
      const ang = R() * Math.PI * 2, rr = 12 + Math.pow(R(), 0.8) * 52;
      const px = Math.cos(ang) * rr, pz = Math.sin(ang) * rr, ph = forestTerrainH(px, pz);
      if (ph > 22) continue;
      const sc = 1.5 + R() * 1.1 + rr * 0.02;
      if (R() < 0.3) pine(g, px, ph, pz, sc * 0.75, R);
      else forestTree(g, px, ph, pz, sc, R);
      placed++;
    }
    for (let k = 0; k < 34; k++) {
      const ang = R() * Math.PI * 2, rr = 7 + R() * 8, px = Math.cos(ang) * rr, pz = Math.sin(ang) * rr;
      bush(g, px, forestTerrainH(px, pz), pz, 0.7 + R() * 0.8, R);
    }
    // mossy stone platform, boulders and mushrooms
    g.frustum(0, 0, -1.2, 6.3, 0.35, 5.8, 14, COL.stone, COL.stone, 0.1);
    g.frustum(0, 0, 0.35, 5.8, 0.7, 5.6, 14, COL.stoneTop, COL.stoneTop, 0.1);
    [[4.7, 1.8, 0.75], [-4.8, -1.4, 0.65], [1.1, -4.9, 0.55], [-2.3, 4.6, 0.8]].forEach((bd, k) =>
      g.box(bd[0], 0.75, bd[1], bd[2] * 1.4, bd[2], bd[2] * 1.2, COL.rock2, k * 0.9));
    [[4.3, 2.8], [4.7, 2.4], [-4.7, 2.0], [-0.4, -4.9]].forEach((m, k) => {
      g.frustum(m[0], m[1], 0.7, 0.07, 1.0, 0.06, 6, COL.pollen, COL.pollen);
      g.frustum(m[0], m[1], 0.98, 0.24, 1.14, 0, 8, k % 2 ? COL.petal : COL.cap);
    });
    // square wooden board with a gold trim and its moss tiles
    const Q = Math.PI / 4;
    g.frustum(0, 0, 0.7, 5.0, 1.32, 4.86, 4, COL.wood, COL.woodTop, Q);
    g.frustum(0, 0, 1.3, 4.93, 1.42, 4.84, 4, COL.trim, COL.woodTop, Q);
    for (let i = 0; i < CELL_COUNT; i++) {
      g.frustum(tileX(i), tileZ(i), 1.42, 0.82, BT, 0.78, 4, COL.moss, (colOf(i) + rowOf(i)) % 2 ? COL.mossTop2 : COL.mossTop, Q);
    }
    return g;
  }

  // ---------------------------------------------------------------- state

  setView(next: CanopyView) {
    const prev = this.view, now = performance.now();
    if (!prev || prev.gameId !== next.gameId) {
      this.stepAnim.clear();
      this.growAnim.clear();
    } else if (next.actionCount !== prev.actionCount && next.last) {
      const a = next.last;
      if (a.kind === 'step') this.stepAnim.set(a.climber, { from: standPos(a.from, next.level[a.from]), to: standPos(a.to, next.level[a.to]), t0: now });
      else if (a.kind === 'grow') this.growAnim.set(a.cell, { t0: now, from: a.level >= BLOSSOM ? 0.9 : Math.max(0.2, (a.level - 1) / a.level) });
      else if (a.kind === 'cut' && a.level > 0) this.growAnim.set(a.cell, { t0: now, from: a.level === TREETOP ? 1.1 : (a.level + 1) / a.level });
    }
    this.hoverCell = -1;
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

  /**
   * Tile under the pointer (−1 = none): the nearest thing the ray meets among each tile's moss, its tree's trunk
   * and crown, and the climber standing on it. A trunk is thin, so tiles behind a tree stay clickable.
   */
  pick(clientX: number, clientY: number): number {
    const v = this.view, r = this.canvas.getBoundingClientRect();
    if (!v || !r.width || !r.height) return -1;
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, 1 - ((clientY - r.top) / r.height) * 2);
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin: o, direction: d } = this.raycaster.ray;
    let best = -1, bestT = Infinity;
    /** Ray against an upright box centred on the tile; keeps the tile when it is the nearest hit so far. */
    const box = (i: number, half: number, y0: number, y1: number) => {
      let t0 = 0, t1 = bestT;
      const slab = (from: number, dir: number, lo: number, hi: number) => {
        if (Math.abs(dir) < 1e-9) return from >= lo && from <= hi;
        const a = (lo - from) / dir, b = (hi - from) / dir;
        t0 = Math.max(t0, Math.min(a, b));
        t1 = Math.min(t1, Math.max(a, b));
        return t0 <= t1;
      };
      if (slab(o.x, d.x, tileX(i) - half, tileX(i) + half) && slab(o.y, d.y, y0, y1) && slab(o.z, d.z, tileZ(i) - half, tileZ(i) + half)) {
        best = i;
        bestT = t0;
      }
    };
    for (let i = 0; i < CELL_COUNT; i++) {
      const lv = v.level[i];
      box(i, HD / 2, BT - 0.2, BT);
      if (lv > 0) {
        box(i, 0.16, BT, BT + CROWN_BASE[lv]);
        box(i, TILE, BT + CROWN_BASE[lv], lv >= BLOSSOM ? BT + BLOSSOM_TOP : topY(lv));
      }
      if (v.climbers.includes(i)) box(i, 0.3, topY(lv), topY(lv) + 0.95);
    }
    return best;
  }

  /** Screen position (CSS px, relative to the canvas) of a tile's top, or of the climber on it; for tests. */
  tileScreenPosition(cell: number): { x: number; y: number } {
    const v = this.view, lv = v?.level[cell] ?? 0, occupied = !!v?.climbers.includes(cell);
    const p = new THREE.Vector3(tileX(cell), topY(lv) + (occupied ? 0.45 : 0), tileZ(cell)).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: ((p.x + 1) / 2) * r.width, y: ((1 - p.y) / 2) * r.height };
  }

  private bindInput() {
    const c = this.canvas;
    let drag: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
    const clampPitch = (p: number) => Math.min(1.4, Math.max(0.25, p));
    /** Whether clicking the tile does something right now: a marker, or one of the mover's climbers. */
    const clickable = (cell: number) => {
      const v = this.view;
      if (!v?.interactive || cell < 0) return false;
      if (v.targets.includes(cell)) return true;
      const k = v.climbers.indexOf(cell);
      return v.phase === 'move' && k >= 0 && ownerOf(k) === v.turn;
    };
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
        const cell = this.view?.interactive ? this.pick(ev.clientX, ev.clientY) : -1;
        this.hoverCell = clickable(cell) ? cell : -1;
        c.style.cursor = this.hoverCell >= 0 ? 'pointer' : 'grab';
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (drag && !drag.moved && this.view?.interactive) this.onPick(this.pick(ev.clientX, ev.clientY));
      drag = null;
      this.dragging = false;
      c.style.cursor = 'grab';
    };
    const onLeave = () => {
      if (!drag) this.hoverCell = -1;
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      this.cam.dist = Math.min(24, Math.max(7, this.cam.dist * (1 + ev.deltaY * 0.001)));
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

  /** Where a climber is right now: on its tile, or hopping towards it. */
  private climberPos(k: number, rest: Vec3, now: number): Vec3 {
    const a = this.stepAnim.get(k);
    if (!a) return rest;
    const t = (now - a.t0) / STEP_MS;
    if (t >= 1) {
      this.stepAnim.delete(k);
      return rest;
    }
    if (t <= 0) return a.from;
    const e = t * t * (3 - 2 * t), lift = Math.max(0, a.to[1] - a.from[1]);
    return [a.from[0] + (a.to[0] - a.from[0]) * e, a.from[1] + (a.to[1] - a.from[1]) * e + Math.sin(t * Math.PI) * (0.5 + lift), a.from[2] + (a.to[2] - a.from[2]) * e];
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

    const v = this.view, pulse = 0.5 + 0.5 * Math.sin(t * 5);

    // trees: each tile shows its stage; a tile that just grew rises out of the previous stage's size, one that
    // was cut sinks back from it
    this.trees.forEach((mesh, i) => {
      const lv = v?.level[i] ?? 0;
      mesh.visible = lv > 0;
      if (!mesh.visible) return;
      mesh.geometry = this.stageGeo[lv - 1][Math.floor(hash2(i * 2.3 + 1, i * 0.7 + 5) * VARIANTS)];
      const anim = this.growAnim.get(i);
      let sy = 1, sxz = 1;
      if (anim) {
        const k = (now - anim.t0) / GROW_MS;
        if (k >= 1) this.growAnim.delete(i);
        else {
          const from = anim.from, ease = 1 - Math.pow(1 - k, 3);
          const spring = Math.sin(k * Math.PI) * 0.1;
          sy = from + (1 - from) * ease + spring;
          sxz = from + (1 - from) * ease - spring * 0.5;
        }
      }
      mesh.scale.set(sxz, sy, sxz);
    });

    // climbers face the camera; the picked-up one glows and lifts a little
    const camPos = this.camera.position;
    this.climbers.forEach((mesh, k) => {
      mesh.visible = !!v;
      if (!v) return;
      const cell = v.climbers[k], owner = ownerOf(k);
      let p = this.climberPos(k, standPos(cell, v.level[cell]), now), em = 0, tint: RGB = [1, 1, 1];
      if (k === v.sel && v.interactive) {
        em = 0.22 + 0.14 * pulse;
        tint = [1.05, 1.02, 0.9];
        p = [p[0], p[1] + 0.14, p[2]];
      } else if (cell === this.hoverCell) em = 0.15;
      mesh.position.set(p[0], p[1], p[2]);
      mesh.rotation.y = Math.atan2(camPos.x - p[0], camPos.z - p[2]) - Math.PI / 2;
      this.glow(mesh.material, COL[owner], em, tint);
    });

    // halos: gold under the selected climber, dim where the last step landed, green where the last tile grew,
    // coral where the last tile was cut
    const halo = (idx: number, cell: number, colour: RGB, e: number, scale: number) => {
      const h = this.halos[idx];
      h.visible = !!v && cell >= 0 && v.level[cell] < BLOSSOM;
      if (!h.visible) return;
      h.position.set(tileX(cell), topY(v!.level[cell]) + 0.03, tileZ(cell));
      h.scale.set(scale, 1, scale);
      this.glow(h.material, COL.white, e, colour);
    };
    const selCell = v && v.sel >= 0 && v.interactive ? v.climbers[v.sel] : -1;
    halo(0, selCell, COL.gold, 0.8, 0.9 + 0.05 * pulse);
    halo(1, v && v.lastStep !== selCell ? v.lastStep : -1, [0.8, 0.8, 0.8], 0.35, 0.9);
    halo(2, v ? v.lastGrow : -1, [0.6, 0.95, 0.55], 0.45, 1.25);
    halo(3, v ? v.lastCut : -1, COL.axe, 0.45, 1.15);

    // markers bob above the tiles the selection can step onto, grow or cut
    this.markers.forEach((mk, i) => {
      const cell = v?.interactive ? v.targets[i] : undefined;
      mk.visible = cell !== undefined;
      if (cell === undefined) return;
      const hov = cell === this.hoverCell, s = hov ? 1.3 : 1, y = topY(v!.level[cell]);
      mk.geometry = this.markerGeo[v!.phase];
      if (v!.phase === 'move') {
        mk.position.set(tileX(cell), y + 0.35 + 0.07 * Math.sin(t * 4 + i), tileZ(cell));
        mk.rotation.y = 0;
        mk.scale.set(s, 1, s);
        this.glow(mk.material, COL.gold, hov ? 0.9 : 0.6 + 0.2 * pulse);
      } else if (v!.phase === 'cut') {
        const crown = v!.level[cell] >= BLOSSOM ? BT + BLOSSOM_TOP : y;
        mk.position.set(tileX(cell), crown + 0.3 + 0.08 * Math.sin(t * 4 + i), tileZ(cell));
        mk.rotation.y = t * 0.6 + i;
        mk.scale.set(s, s, s);
        this.glow(mk.material, COL.axe, hov ? 0.9 : 0.55 + 0.2 * pulse);
      } else {
        mk.position.set(tileX(cell), y + 0.06 + 0.04 * Math.sin(t * 4 + i), tileZ(cell));
        mk.rotation.y = t * 0.8 + i;
        mk.scale.set(s, s * (0.9 + 0.1 * pulse), s);
        this.glow(mk.material, COL.sprout, hov ? 0.9 : 0.55 + 0.2 * pulse);
      }
    });

    // lanterns float over their treetop (above the head of a climber standing there) and light the leaves
    let used = 0;
    if (v) {
      for (let i = 0; i < CELL_COUNT && used < MAX_LANTERNS; i++) {
        const owner = v.lantern[i];
        if (!owner) continue;
        const { mesh, light } = this.lanterns[used++];
        const y = topY(TREETOP) + (v.climbers.includes(i) ? 1.5 : 0.62) + 0.07 * Math.sin(t * 2 + i);
        mesh.visible = true;
        mesh.position.set(tileX(i), y, tileZ(i));
        mesh.rotation.y = t * 0.5 + i;
        mesh.scale.setScalar(1.3);
        this.glow(mesh.material, COL.white, 0.85 + 0.1 * Math.sin(t * 3 + i), TINT[owner]);
        light.position.set(tileX(i), y, tileZ(i));
        light.color.setRGB(...TINT[owner]);
        light.intensity = 3.2 + 0.4 * Math.sin(t * 3 + i);
      }
    }
    for (let i = used; i < MAX_LANTERNS; i++) {
      this.lanterns[i].mesh.visible = false;
      this.lanterns[i].light.intensity = 0;
    }

    // fireflies drift and blink
    const o = new THREE.Object3D();
    this.flyData.forEach((F, j) => {
      const fl = Math.max(0, Math.sin(t * 1.7 + F.ph * 3));
      o.position.set(F.x + Math.sin(t * F.sp + F.ph) * 1.6, F.y + Math.sin(t * 0.9 + F.ph) * 0.5, F.z + Math.cos(t * F.sp * 0.8 + F.ph) * 1.6);
      o.scale.setScalar(Math.max(fl, 1e-3));
      o.updateMatrix();
      this.fireflies.setMatrixAt(j, o.matrix);
    });
    this.fireflies.instanceMatrix.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    for (const [type, fn, opts] of this.handlers) this.canvas.removeEventListener(type, fn, opts);
    const geos = new Set<THREE.BufferGeometry>([...this.stageGeo.flat(), ...Object.values(this.markerGeo)]), mats = new Set<THREE.Material>();
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
