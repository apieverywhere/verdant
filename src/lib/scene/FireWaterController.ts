/**
 * three.js scene for Ember & Tide: moonlit ice lake, aurora, snowy pines, ice island, 5×5 board and stacked pieces.
 * Same contract as SceneController: it holds no rules, receives a view and derives animations by diffing views.
 * See docs/specs/game-lobby/design.md §3.
 */
import * as THREE from 'three';
import { CELLS, COLUMNS, dropCell, stackHeight } from '../fire-water/rules';
import type { Cell, Outcome, Player } from '../game/types';
import { Geo, hexRgb, type RGB, type Vec3 } from './geometry';
import { moonSkyMaterial, waterMaterial } from './shaders';
import { hash2, MOON_SKY, moonTerrainH, rng, type Rng } from './terrain';

export interface FireWaterView {
  board: Cell[];
  turn: Player;
  winner: Outcome | null;
  line: number[] | null;
  /** Whether a human may click a column right now. */
  interactive: boolean;
  /** Changes on every new game so pieces are cleared without animation. */
  gameId: number;
}

const COL = {
  sky: { top: hexRgb('#03061a'), mid: hexRgb('#0f2550'), hor: hexRgb('#2f6385'), fog: hexRgb('#1b3450'), moon: hexRgb('#e8f0ff') },
  light: { sun: [0.66, 0.73, 0.94] as RGB, sky: [0.34, 0.4, 0.6] as RGB, gnd: [0.1, 0.12, 0.18] as RGB },
  water: hexRgb('#1d4466'),
  sand: hexRgb('#b9c6da'), snowlow: hexRgb('#a8bad3'), snowlow2: hexRgb('#bccbe0'), rock: hexRgb('#34405c'), rock2: hexRgb('#4d5d80'), snow: hexRgb('#e9f0fb'),
  pine: hexRgb('#1d3a42'), pine2: hexRgb('#25474d'), trunk: hexRgb('#3a2f35'),
  frame: hexRgb('#1f3346'), trim: hexRgb('#d6ad6c'), tile: hexRgb('#e3eaf5'),
  X: hexRgb('#ff6a3d'), X2: hexRgb('#ffb347'), O: hexRgb('#3d9bff'), O2: hexRgb('#9fd4ff'), markX: hexRgb('#ffe08a'), markO: hexRgb('#eaf6ff'),
  gold: hexRgb('#ffd27a'), lantern: hexRgb('#ffb45a'),
};
const LIGHT_DIR = new THREE.Vector3(0.4, 0.72, -0.5).normalize();
const FOG_DENSITY = 0.0074;
const CELL_SIZE = 1.7;
const LAYER_H = 0.78;
const BOARD_TOP = 1.78;
const DROP_FROM = BOARD_TOP + 5 * LAYER_H + 0.95;
const FOV = 0.85; // radians, as in the design
const DEFAULT_DIST = 23;
/** Half-width (world units) that must stay visible on narrow screens: the board and its corners. */
const BOARD_FIT = 7.2;
const PORTRAIT_DROP = 4;
const PICK_RADIUS = 0.74;
const DROP_MS = 500;
const WIN_DELAY_MS = 520;
const BAR_GROW_MS = 420;
const IDLE_ROTATE_MS = 7000;

const FLAME: [number, number][] = [[0, 0.46], [0.11, 0.3], [0.23, 0.15], [0.3, -0.04], [0.27, -0.2], [0.15, -0.32], [0, -0.36], [-0.15, -0.32], [-0.27, -0.2], [-0.3, -0.04], [-0.24, 0.08], [-0.17, 0.03], [-0.13, 0.17], [-0.05, 0.3]];
const DROPLET: [number, number][] = [[0, 0.44]];
for (let k = 0; k <= 18; k++) {
  const a = Math.PI * (0.22 - (k * 1.44) / 18);
  DROPLET.push([Math.cos(a) * 0.28, -0.08 + Math.sin(a) * 0.28]);
}

const colX = (col: number) => ((col % 5) - 2) * CELL_SIZE;
const colZ = (col: number) => (Math.floor(col / 5) - 2) * CELL_SIZE;
const cellPos = (i: number): Vec3 => [colX(i % COLUMNS), BOARD_TOP + LAYER_H / 2 + Math.floor(i / COLUMNS) * LAYER_H, colZ(i % COLUMNS)];

type LambertMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;

export class FireWaterController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private clock0 = performance.now();
  private raf = 0;
  private lastT = 0;
  private resizeObs: ResizeObserver;
  private handlers: [string, EventListener, AddEventListenerOptions | boolean][] = [];

  private cam = { yaw: 0.6, pitch: 0.58, dist: DEFAULT_DIST, target: new THREE.Vector3(0, BOARD_TOP + 1.9, 0) };
  private lastInteract = performance.now();
  private dragging = false;
  private hoverCol = -1;

  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private water!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private tiles: LambertMesh[] = [];
  private pieces: LambertMesh[] = [];
  private placedAt: number[] = Array(CELLS).fill(0);
  private pieceGeo!: Record<Player, THREE.BufferGeometry>;
  private ghost!: LambertMesh;
  private bar!: LambertMesh;
  private lanterns!: THREE.InstancedMesh;
  private lanternData: { x: number; z: number; ph: number; sp: number; sw: number; s: number }[] = [];

  private view: FireWaterView | null = null;
  private winAt = 0;
  autoRotate = true;

  constructor(private canvas: HTMLCanvasElement, private onPick: (col: number) => void) {
    THREE.ColorManagement.enabled = false; // use the design's colour values as-is
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(new THREE.Color(...COL.sky.fog), 1);
    this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(FOV), 1, 0.3, 1500);

    this.scene.fog = new THREE.FogExp2(new THREE.Color(...COL.sky.fog), FOG_DENSITY);
    // Intensity π: three's Lambert BRDF divides by π, this restores the design's lighting formula.
    this.scene.add(new THREE.HemisphereLight(new THREE.Color(...COL.light.sky), new THREE.Color(...COL.light.gnd), Math.PI));
    const moon = new THREE.DirectionalLight(new THREE.Color(...COL.light.sun), Math.PI);
    moon.position.copy(LIGHT_DIR);
    this.scene.add(moon);

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

  private piece(body: RGB, rim: RGB, mark: RGB, outline: readonly [number, number][]) {
    const g = new Geo(), hh = LAYER_H / 2 - 0.02;
    g.frustum(0, 0, -hh, 0.72, hh, 0.72, 32, body, body);
    g.frustum(0, 0, hh - 0.04, 0.73, hh - 0.01, 0.73, 32, rim, rim);
    g.frustum(0, 0, -hh + 0.01, 0.73, -hh + 0.04, 0.73, 32, rim, rim);
    g.extrude(outline.map(([x, z]) => [x * 1.35, -z * 1.35] as const), hh - 0.01, hh + 0.05, mark);
    return g.toGeometry();
  }

  private buildScene() {
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 18),
      moonSkyMaterial({ moon: MOON_SKY, top: COL.sky.top, mid: COL.sky.mid, hor: COL.sky.hor, fog: COL.sky.fog, moonCol: COL.sky.moon }),
    );
    this.sky.scale.setScalar(500);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    this.scene.add(new THREE.Mesh(this.buildWorld().toGeometry(), this.lambert()));

    const S = 340, wg = new THREE.PlaneGeometry(S * 2, S * 2).rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, waterMaterial({
      base: COL.water, light: LIGHT_DIR.toArray(), sunCol: COL.light.sun, skyCol: COL.light.sky, gndCol: COL.light.gnd,
      fog: COL.sky.fog, fogDensity: FOG_DENSITY, spec: 1.1,
    }));
    this.scene.add(this.water);

    const tileGeo = new Geo();
    tileGeo.box(0, BOARD_TOP - 0.08, 0, 1.5, 0.16, 1.5, COL.tile);
    const tg = tileGeo.toGeometry();
    for (let col = 0; col < COLUMNS; col++) {
      const tile = new THREE.Mesh(tg, this.lambert());
      tile.position.set(colX(col), 0, colZ(col));
      this.tiles.push(tile);
      this.scene.add(tile);
    }

    this.pieceGeo = {
      X: this.piece(COL.X, COL.X2, COL.markX, FLAME),
      O: this.piece(COL.O, COL.O2, COL.markO, DROPLET),
    };
    // One pooled mesh per cell; its geometry follows whoever occupies the cell.
    for (let i = 0; i < CELLS; i++) {
      const mesh = new THREE.Mesh(this.pieceGeo.X, this.lambert());
      mesh.visible = false;
      this.pieces.push(mesh);
      this.scene.add(mesh);
    }
    this.ghost = new THREE.Mesh(this.pieceGeo.X, this.lambert());
    this.ghost.visible = false;
    this.scene.add(this.ghost);

    const bg = new Geo();
    bg.box(0, 0, 0, 1, 1, 1, COL.gold);
    this.bar = new THREE.Mesh(bg.toGeometry(), this.lambert());
    this.bar.visible = false;
    this.glow(this.bar.material, COL.gold, 0.85);
    this.scene.add(this.bar);

    const lg = new Geo();
    lg.frustum(0, 0, 0, 0.3, 0.75, 0.42, 6, COL.lantern, COL.lantern);
    const R = rng(19);
    for (let i = 0; i < 22; i++) {
      const a = R() * Math.PI * 2, r = 11 + R() * 40;
      this.lanternData.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ph: R(), sp: 0.01 + R() * 0.012, sw: R() * 6, s: 0.6 + R() * 0.5 });
    }
    this.lanterns = new THREE.InstancedMesh(lg.toGeometry(), this.glow(this.lambert(), COL.lantern, 0.95), this.lanternData.length);
    this.lanterns.frustumCulled = false;
    this.scene.add(this.lanterns);
  }

  /** Design's emission: colour = mix(lit, base·1.35, e) → scale diffuse by (1−e), add base·1.35·e. */
  private glow(m: THREE.MeshLambertMaterial, base: RGB, e: number, tint: RGB = [1, 1, 1]) {
    m.color.setRGB(tint[0] * (1 - e), tint[1] * (1 - e), tint[2] * (1 - e));
    m.emissive.setRGB(base[0] * tint[0] * 1.35 * e, base[1] * tint[1] * 1.35 * e, base[2] * tint[2] * 1.35 * e);
    return m;
  }

  private buildWorld(): Geo {
    const g = new Geo(), N = 150, S = 330, st = S / N, H: [number, number, number][] = [];
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        let x = -S / 2 + i * st, z = -S / 2 + j * st;
        if (i > 0 && i < N && j > 0 && j < N) {
          x += (hash2(i * 3.1, j * 1.7) - 0.5) * st * 0.55;
          z += (hash2(i * 1.3, j * 2.9) - 0.5) * st * 0.55;
        }
        H.push([x, moonTerrainH(x, z), z]);
      }
    }
    const R = rng(9);
    const tcol = (p: number[], q: number[], s: number[]): RGB => {
      const h = (p[1] + q[1] + s[1]) / 3;
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = s[0] - p[0], vy = s[1] - p[1], vz = s[2] - p[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const ly = Math.abs(ny) / (Math.hypot(nx, ny, nz) || 1);
      let c: RGB;
      if (h < 0.7) c = COL.sand;
      else if (ly > 0.62) c = h > 30 ? COL.snow : h < 8 ? COL.snowlow2 : COL.snowlow;
      else if (h > 30) c = COL.rock2;
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
    // snowy pines on the shores and lower slopes
    let placed = 0;
    for (let t = 0; t < 1400 && placed < 230; t++) {
      const ang = R() * Math.PI * 2, rr = 25 + R() * 40;
      const px = Math.cos(ang) * rr, pz = Math.sin(ang) * rr, ph = moonTerrainH(px, pz);
      if (ph < 1.0 || ph > 18) continue;
      this.pine(g, px, ph - 0.2, pz, 0.8 + R() * 0.9, R);
      placed++;
    }
    // ice island under the board
    g.frustum(0, 0, -4.5, 11.4, 0.2, 10.0, 12, COL.rock, COL.rock, 0.3);
    g.frustum(0, 0, 0.2, 10.0, 1.0, 9.6, 12, COL.snowlow2, COL.snowlow2, 0.3);
    const boulders = [[9.2, 2.6, 1.2], [-8.6, -4.8, 1.0], [3.2, -9.2, 0.9], [-5.8, 7.8, 1.1]];
    boulders.forEach((bd, k) => g.box(bd[0], 0.5, bd[1], bd[2] * 1.4, bd[2], bd[2] * 1.2, COL.rock2, k * 0.9));
    this.pine(g, 7.6, 0.9, 6.6, 0.65, R);
    this.pine(g, -8.4, 0.9, 3.4, 0.6, R);
    this.pine(g, -6.4, 0.9, -7.2, 0.75, R);
    // board frame + gold trim
    const half = 2.5 * CELL_SIZE + 0.35;
    g.box(0, 1.3, 0, 2 * half, 0.6, 2 * half, COL.frame);
    g.box(0, 1.63, half, 2 * half + 0.12, 0.08, 0.14, COL.trim);
    g.box(0, 1.63, -half, 2 * half + 0.12, 0.08, 0.14, COL.trim);
    g.box(half, 1.63, 0, 0.14, 0.08, 2 * half + 0.12, COL.trim);
    g.box(-half, 1.63, 0, 0.14, 0.08, 2 * half + 0.12, COL.trim);
    return g;
  }

  private pine(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
    const c = R() < 0.5 ? COL.pine : COL.pine2;
    g.frustum(x, z, y, 0.22 * s, y + 1.1 * s, 0.18 * s, 5, COL.trunk);
    g.frustum(x, z, y + 0.8 * s, 1.5 * s, y + 2.8 * s, 0.0, 7, c, null, R());
    g.frustum(x, z, y + 1.9 * s, 1.15 * s, y + 3.7 * s, 0.0, 7, c, null, R());
    g.frustum(x, z, y + 2.9 * s, 0.8 * s, y + 4.5 * s, 0.0, 6, COL.snowlow2, null, R());
  }

  // ---------------------------------------------------------------- state

  setView(next: FireWaterView) {
    const prev = this.view, now = performance.now();
    const fresh = !prev || prev.gameId !== next.gameId;
    for (let i = 0; i < CELLS; i++) {
      if (fresh) this.placedAt[i] = 0;
      else if (next.board[i] && !prev!.board[i]) this.placedAt[i] = now;
    }
    if (next.line && (fresh || !prev!.line)) this.winAt = now + WIN_DELAY_MS;
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
    return new THREE.Vector3(
      f.x + dist * cp * Math.sin(c.yaw),
      f.y + dist * Math.sin(c.pitch),
      f.z + dist * cp * Math.cos(c.yaw),
    );
  }

  /** Column under the pointer, or −1: the board surface first, then each stack as an exact cylinder. */
  pick(clientX: number, clientY: number): number {
    const r = this.canvas.getBoundingClientRect(), v = this.view;
    if (!r.width || !r.height || !v) return -1;
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, 1 - ((clientY - r.top) / r.height) * 2);
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin: e, direction: d } = this.raycaster.ray;
    let best = -1, bestT = Infinity;
    if (d.y < -1e-4) {
      const k = (BOARD_TOP - e.y) / d.y;
      if (k > 0) {
        const bx = e.x + d.x * k, bz = e.z + d.z * k;
        const ix = Math.round(bx / CELL_SIZE) + 2, iz = Math.round(bz / CELL_SIZE) + 2;
        const onBoard = ix >= 0 && ix <= 4 && iz >= 0 && iz <= 4;
        if (onBoard && Math.abs(bx - (ix - 2) * CELL_SIZE) <= 0.8 && Math.abs(bz - (iz - 2) * CELL_SIZE) <= 0.8) {
          best = ix + 5 * iz;
          bestT = k;
        }
      }
    }
    const a2 = d.x * d.x + d.z * d.z;
    for (let col = 0; col < COLUMNS; col++) {
      const n = stackHeight(v.board, col);
      if (!n) continue;
      const cx = colX(col), cz = colZ(col), topY = BOARD_TOP + n * LAYER_H;
      if (d.y < -1e-4) {
        const kt = (topY - e.y) / d.y;
        if (kt > 0 && kt < bestT && Math.hypot(e.x + d.x * kt - cx, e.z + d.z * kt - cz) <= PICK_RADIUS) {
          bestT = kt;
          best = col;
        }
      }
      if (a2 > 1e-8) {
        const ox = e.x - cx, oz = e.z - cz, bb = 2 * (ox * d.x + oz * d.z), cc = ox * ox + oz * oz - PICK_RADIUS * PICK_RADIUS;
        const disc = bb * bb - 4 * a2 * cc;
        if (disc >= 0) {
          const ts = (-bb - Math.sqrt(disc)) / (2 * a2), py = e.y + d.y * ts;
          if (ts > 0 && ts < bestT && py >= BOARD_TOP && py <= topY) {
            bestT = ts;
            best = col;
          }
        }
      }
    }
    return best;
  }

  /** Screen position (CSS px, relative to the canvas) of the top of a column — handy for tests and overlays. */
  columnScreenPosition(col: number): { x: number; y: number } {
    const n = this.view ? stackHeight(this.view.board, col) : 0;
    const v = new THREE.Vector3(colX(col), BOARD_TOP + n * LAYER_H, colZ(col)).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  private bindInput() {
    const c = this.canvas;
    let drag: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
    const clampPitch = (p: number) => Math.min(1.35, Math.max(0.08, p));
    const onDown = (ev: PointerEvent) => {
      drag = { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY, moved: false };
      this.dragging = true;
      try { c.setPointerCapture(ev.pointerId); } catch { /* not capturable */ }
      c.style.cursor = 'grabbing';
      this.lastInteract = performance.now();
    };
    const onMove = (ev: PointerEvent) => {
      if (drag) {
        const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
        drag.x = ev.clientX;
        drag.y = ev.clientY;
        if (Math.abs(ev.clientX - drag.sx) + Math.abs(ev.clientY - drag.sy) > 6) drag.moved = true;
        if (drag.moved) {
          this.cam.yaw -= dx * 0.006;
          this.cam.pitch = clampPitch(this.cam.pitch + dy * 0.005);
        }
        this.lastInteract = performance.now();
      } else {
        const v = this.view, col = v?.interactive ? this.pick(ev.clientX, ev.clientY) : -1;
        this.hoverCol = col >= 0 && dropCell(v!.board, col) >= 0 ? col : -1;
        c.style.cursor = this.hoverCol >= 0 ? 'pointer' : 'grab';
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (drag && !drag.moved) {
        const col = this.pick(ev.clientX, ev.clientY);
        if (col >= 0) this.onPick(col);
        this.hoverCol = -1;
      }
      drag = null;
      this.dragging = false;
      c.style.cursor = 'grab';
    };
    const onLeave = () => { if (!drag) this.hoverCol = -1; };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      this.cam.dist = Math.min(46, Math.max(10, this.cam.dist * (1 + ev.deltaY * 0.001)));
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

  private frame() {
    const now = performance.now(), t = (now - this.clock0) / 1000;
    const dt = Math.min(0.05, (now - (this.lastT || now)) / 1000);
    this.lastT = now;
    if (this.autoRotate && !this.dragging && now - this.lastInteract > IDLE_ROTATE_MS) this.cam.yaw += dt * 0.045;

    this.camera.position.copy(this.eye());
    this.camera.lookAt(this.focus());
    this.sky.position.copy(this.camera.position);
    this.sky.material.uniforms.uTime.value = t;
    this.water.material.uniforms.uTime.value = t;

    const v = this.view;
    const line = v?.line ?? null;
    const won = !!line && now > this.winAt;
    const canHover = !!v?.interactive;
    const tc = v ? COL[v.turn] : COL.X;

    for (let col = 0; col < COLUMNS; col++) {
      // column tile: hover tint in the colour of the player to move, dimmed once the column is full
      let tint: RGB = [1, 1, 1];
      if (v && dropCell(v.board, col) < 0) tint = [0.78, 0.8, 0.88];
      if (col === this.hoverCol && canHover) tint = [0.65 + tc[0] * 0.4, 0.65 + tc[1] * 0.4, 0.65 + tc[2] * 0.4];
      this.glow(this.tiles[col].material, COL.tile, 0, tint);
    }

    for (let i = 0; i < CELLS; i++) this.animatePiece(i, now, t, won && line!.includes(i));
    this.animateGhost(t, canHover);

    if (won) {
      const g = Math.min(1, (now - this.winAt) / BAR_GROW_MS);
      const a = new THREE.Vector3(...cellPos(line![0])), b = new THREE.Vector3(...cellPos(line![3]));
      const dir = b.clone().sub(a), len = (dir.length() + 1.0) * g;
      this.bar.visible = true;
      this.bar.position.copy(a).add(b).multiplyScalar(0.5).setY((a.y + b.y) / 2 + 0.05);
      this.bar.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
      this.bar.scale.set(Math.max(len, 1e-3), 0.12, 0.12);
    } else {
      this.bar.visible = false;
    }

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

  private animatePiece(i: number, now: number, t: number, win: boolean) {
    const mesh = this.pieces[i], p = this.view?.board[i];
    mesh.visible = !!p;
    if (!p) return;
    const [x, restY, z] = cellPos(i);
    // drop-in: accelerates down, with a small bounce at the end; Fire spins a quarter turn on the way
    const k = this.placedAt[i] ? Math.min(1, Math.max(0, (now - this.placedAt[i]) / DROP_MS)) : 1;
    let y = DROP_FROM + (restY - DROP_FROM) * k * k;
    if (k >= 1) y = restY;
    else if (k > 0.85) y = restY + Math.sin(((k - 0.85) / 0.15) * Math.PI) * 0.06;
    const sc = win ? 1.08 + 0.05 * Math.sin(t * 6 + i) : 1;
    mesh.geometry = this.pieceGeo[p];
    mesh.position.set(x, y, z);
    mesh.rotation.set(0, p === 'X' ? (1 - k) * Math.PI * 0.5 : 0, 0);
    mesh.scale.set(sc, 1, sc);
    this.glow(mesh.material, COL[p], win ? 0.35 + 0.2 * Math.sin(t * 6) : 0);
  }

  /** Faint bobbing piece where the next drop would land in the hovered column. */
  private animateGhost(t: number, canHover: boolean) {
    const v = this.view;
    const cell = v && canHover && this.hoverCol >= 0 ? dropCell(v.board, this.hoverCol) : -1;
    this.ghost.visible = cell >= 0;
    if (cell < 0) return;
    const [x, y, z] = cellPos(cell);
    this.ghost.geometry = this.pieceGeo[v!.turn];
    this.ghost.position.set(x, y + 0.12 + 0.08 * Math.sin(t * 5), z);
    this.ghost.scale.setScalar(0.94);
    this.glow(this.ghost.material, COL[v!.turn], 0.4 + 0.15 * Math.sin(t * 5), [0.8, 0.8, 0.8]);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    for (const [type, fn, opts] of this.handlers) this.canvas.removeEventListener(type, fn, opts);
    const geos = new Set<THREE.BufferGeometry>(Object.values(this.pieceGeo)), mats = new Set<THREE.Material>();
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
