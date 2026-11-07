/**
 * three.js scene for the board: sunset valley, lake, pines, stone island, board and sky lanterns.
 * Holds no game rules — it receives a `SceneView` and derives animations by diffing views.
 * See docs/specs/vanishing-tic-tac-toe/design.md §4.
 */
import * as THREE from 'three';
import type { Cell, Outcome, Player } from '../game/types';
import { Geo, hexRgb, type RGB } from './geometry';
import { skyMaterial, waterMaterial } from './shaders';
import { hash2, rng, SUN_SKY, terrainH, type Rng } from './terrain';

export interface SceneView {
  board: Cell[];
  turn: Player;
  winner: Outcome | null;
  line: number[] | null;
  /** Cell of the piece that vanishes on the current move, if any. */
  vanishing: number | null;
  /** Whether a human may click a cell right now. */
  interactive: boolean;
  /** Changes on every new game so pieces are cleared without a vanish animation. */
  gameId: number;
}

const COL = {
  sky: { top: hexRgb('#0b1d2c'), mid: hexRgb('#2f5f80'), hor: hexRgb('#f4b07c'), fog: hexRgb('#7d97a8'), sun: hexRgb('#ffd6a2') },
  light: { sun: [1.0, 0.82, 0.66] as RGB, sky: [0.42, 0.48, 0.62] as RGB, gnd: [0.2, 0.2, 0.24] as RGB },
  water: hexRgb('#2b5f78'),
  sand: hexRgb('#ab917e'), grass: hexRgb('#4a6c55'), grass2: hexRgb('#5c7b5a'), rock: hexRgb('#3f5266'), rock2: hexRgb('#5f748a'), snow: hexRgb('#ece5f1'),
  pine: hexRgb('#2e5048'), pine2: hexRgb('#3a5f50'), trunk: hexRgb('#4b3a38'),
  frame: hexRgb('#1f3346'), trim: hexRgb('#d6ad6c'), cell: hexRgb('#f0e5d1'),
  X: hexRgb('#ff6f5e'), O: hexRgb('#3fd2c6'), gold: hexRgb('#ffd27a'), lantern: hexRgb('#ffb45a'),
};
const LIGHT_DIR = new THREE.Vector3(-0.45, 0.62, -0.64).normalize();
const FOG_DENSITY = 0.0072;
const CELL_GAP = 2.3;
const BOARD_TOP = 1.78;
const FOV = 0.85; // radians, as in the design
const DEFAULT_DIST = 19;
/** Half-width (world units) that must stay visible: the board plus its corner lanterns. */
const BOARD_FIT = 6.2;
const DROP_MS = 460;
const VANISH_MS = 450;
const WIN_DELAY_MS = 380;
const BAR_GROW_MS = 420;
const IDLE_ROTATE_MS = 7000;

const cellX = (i: number) => ((i % 3) - 1) * CELL_GAP;
const cellZ = (i: number) => (Math.floor(i / 3) - 1) * CELL_GAP;

interface PieceAnim {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  placedAt: number;
  /** 0 = not vanishing; otherwise the time the vanish animation started. */
  vanishAt: number;
}

export class SceneController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private clock0 = performance.now();
  private raf = 0;
  private lastT = 0;
  private resizeObs: ResizeObserver;
  private handlers: [string, EventListener, AddEventListenerOptions | boolean][] = [];

  private cam = { yaw: 0.35, pitch: 0.62, dist: DEFAULT_DIST, target: new THREE.Vector3(0, 1.4, 0) };
  private lastInteract = performance.now();
  private dragging = false;
  private hover = -1;

  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private water!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private cells: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
  private pieces: Record<Player, PieceAnim[]> = { X: [], O: [] };
  private bar!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  private lanterns!: THREE.InstancedMesh;
  private lanternData: { x: number; z: number; ph: number; sp: number; sw: number; s: number }[] = [];

  private view: SceneView | null = null;
  private winAt = 0;
  autoRotate = true;

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

  private buildScene() {
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 18),
      skyMaterial({ sun: SUN_SKY, top: COL.sky.top, mid: COL.sky.mid, hor: COL.sky.hor, fog: COL.sky.fog, sunCol: COL.sky.sun }),
    );
    this.sky.scale.setScalar(500);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    this.scene.add(new THREE.Mesh(this.buildWorld().toGeometry(), this.lambert()));

    const S = 340, wg = new THREE.PlaneGeometry(S * 2, S * 2).rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, waterMaterial({
      base: COL.water, light: LIGHT_DIR.toArray(), sunCol: COL.light.sun, skyCol: COL.light.sky, gndCol: COL.light.gnd,
      fog: COL.sky.fog, fogDensity: FOG_DENSITY, spec: 1.4,
    }));
    this.scene.add(this.water);

    const cellGeo = new Geo();
    cellGeo.box(0, BOARD_TOP - 0.09, 0, 2.05, 0.18, 2.05, COL.cell);
    const cg = cellGeo.toGeometry();
    const xg = new Geo();
    xg.box(0, 0.17, 0, 1.62, 0.32, 0.34, COL.X, Math.PI / 4);
    xg.box(0, 0.17, 0, 1.62, 0.32, 0.34, COL.X, -Math.PI / 4);
    const og = new Geo();
    og.torus(0.56, 0.2, 28, 12, COL.O, 0.2);
    const pieceGeo = { X: xg.toGeometry(), O: og.toGeometry() };

    for (let i = 0; i < 9; i++) {
      const cell = new THREE.Mesh(cg, this.lambert());
      cell.position.set(cellX(i), 0, cellZ(i));
      cell.userData.cell = i;
      this.cells.push(cell);
      this.scene.add(cell);
      for (const p of ['X', 'O'] as const) {
        const mesh = new THREE.Mesh(pieceGeo[p], this.lambert({ transparent: true }));
        mesh.visible = false;
        this.pieces[p].push({ mesh, placedAt: 0, vanishAt: 0 });
        this.scene.add(mesh);
      }
    }

    const bg = new Geo();
    bg.box(0, 0, 0, 1, 1, 1, COL.gold);
    this.bar = new THREE.Mesh(bg.toGeometry(), this.lambert());
    this.bar.visible = false;
    this.scene.add(this.bar);

    const lg = new Geo();
    lg.frustum(0, 0, 0, 0.3, 0.75, 0.42, 6, COL.lantern, COL.lantern);
    const R = rng(77);
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI * 2, r = 9 + R() * 42;
      this.lanternData.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ph: R(), sp: 0.012 + R() * 0.012, sw: R() * 6, s: 0.7 + R() * 0.5 });
    }
    this.lanterns = new THREE.InstancedMesh(lg.toGeometry(), this.glow(this.lambert(), COL.lantern, 0.9), this.lanternData.length);
    this.lanterns.frustumCulled = false;
    this.scene.add(this.lanterns);
    this.glow(this.bar.material, COL.gold, 0.75);
  }

  /** Design's emission: colour = mix(lit, base·1.3, e) → scale diffuse by (1−e), add base·1.3·e. */
  private glow(m: THREE.MeshLambertMaterial, base: RGB, e: number, tint: RGB = [1, 1, 1]) {
    m.color.setRGB(tint[0] * (1 - e), tint[1] * (1 - e), tint[2] * (1 - e));
    m.emissive.setRGB(base[0] * tint[0] * 1.3 * e, base[1] * tint[1] * 1.3 * e, base[2] * tint[2] * 1.3 * e);
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
        H.push([x, terrainH(x, z), z]);
      }
    }
    const R = rng(5);
    const tcol = (p: number[], q: number[], s: number[]): RGB => {
      const h = (p[1] + q[1] + s[1]) / 3;
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = s[0] - p[0], vy = s[1] - p[1], vz = s[2] - p[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const ly = Math.abs(ny) / (Math.hypot(nx, ny, nz) || 1);
      let c: RGB;
      if (h < 0.7) c = COL.sand;
      else if (h > 38 && ly > 0.5) c = COL.snow;
      else if (h > 30) c = COL.rock2;
      else if (h < 14 && ly > 0.72) c = h < 6 ? COL.grass2 : COL.grass;
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
    // pines on the shores and lower slopes
    let placed = 0;
    for (let t = 0; t < 1400 && placed < 240; t++) {
      const ang = R() * Math.PI * 2, rr = 25 + R() * 40;
      const px = Math.cos(ang) * rr, pz = Math.sin(ang) * rr, ph = terrainH(px, pz);
      if (ph < 1.0 || ph > 17) continue;
      this.pine(g, px, ph - 0.2, pz, 0.8 + R() * 0.9, R);
      placed++;
    }
    // stone island under the board
    g.frustum(0, 0, -4.5, 10.8, 0.2, 9.4, 11, COL.rock, COL.rock, 0.3);
    g.frustum(0, 0, 0.2, 9.4, 1.0, 9.0, 11, COL.grass2, COL.grass2, 0.3);
    const boulders = [[8.6, 2.0, 1.4], [-7.8, -4.4, 1.1], [3.4, -8.6, 1.0], [-5.6, 7.4, 1.3], [9.6, -5.0, 0.9]];
    boulders.forEach((bd, k) => g.box(bd[0], 0.5, bd[1], bd[2] * 1.4, bd[2], bd[2] * 1.2, COL.rock2, k * 0.9));
    this.pine(g, 7.6, 0.9, 5.8, 0.75, R);
    this.pine(g, -7.9, 0.9, 4.2, 0.6, R);
    this.pine(g, -6.2, 0.9, -6.6, 0.8, R);
    this.pine(g, 6.4, 0.9, -6.9, 0.65, R);
    // board frame + gold trim
    g.box(0, 1.3, 0, 7.6, 0.6, 7.6, COL.frame);
    g.box(0, 1.63, 3.74, 7.72, 0.08, 0.14, COL.trim);
    g.box(0, 1.63, -3.74, 7.72, 0.08, 0.14, COL.trim);
    g.box(3.74, 1.63, 0, 0.14, 0.08, 7.72, COL.trim);
    g.box(-3.74, 1.63, 0, 0.14, 0.08, 7.72, COL.trim);
    // small stone lanterns at the board corners
    for (const q of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = q[0] * 4.7, z = q[1] * 4.7;
      g.box(x, 1.3, z, 0.5, 0.6, 0.5, COL.rock2, 0.785);
      g.box(x, 1.8, z, 0.36, 0.4, 0.36, COL.lantern, 0.785);
      g.frustum(x, z, 2.0, 0.45, 2.35, 0.0, 4, COL.frame, null, 0);
    }
    return g;
  }

  private pine(g: Geo, x: number, y: number, z: number, s: number, R: Rng) {
    const c = R() < 0.5 ? COL.pine : COL.pine2;
    g.frustum(x, z, y, 0.22 * s, y + 1.1 * s, 0.18 * s, 5, COL.trunk);
    g.frustum(x, z, y + 0.8 * s, 1.5 * s, y + 2.8 * s, 0.0, 7, c, null, R());
    g.frustum(x, z, y + 1.9 * s, 1.15 * s, y + 3.7 * s, 0.0, 7, c, null, R());
    g.frustum(x, z, y + 2.9 * s, 0.8 * s, y + 4.5 * s, 0.0, 6, c, null, R());
  }

  // ---------------------------------------------------------------- state

  setView(next: SceneView) {
    const prev = this.view, now = performance.now();
    const fresh = !prev || prev.gameId !== next.gameId;
    for (let i = 0; i < 9; i++) {
      const was = fresh ? null : prev!.board[i], is = next.board[i];
      for (const p of ['X', 'O'] as const) {
        const a = this.pieces[p][i];
        if (is === p && was !== p) {
          a.placedAt = now;
          a.vanishAt = 0;
        } else if (was === p && is !== p) {
          a.vanishAt = now;
        } else if (fresh) {
          a.vanishAt = 0; // new game: clear instantly, no vanish animation
        }
      }
    }
    if (next.line && (fresh || !prev!.line)) this.winAt = now + WIN_DELAY_MS;
    this.view = next;
  }

  // ---------------------------------------------------------------- input

  private eye(): THREE.Vector3 {
    const c = this.cam, cp = Math.cos(c.pitch);
    // On portrait screens the horizontal field of view is narrow: back off so the board still fits.
    const halfH = Math.tan(FOV / 2) * this.camera.aspect;
    const dist = c.dist * Math.max(1, BOARD_FIT / halfH / DEFAULT_DIST);
    return new THREE.Vector3(
      c.target.x + dist * cp * Math.sin(c.yaw),
      c.target.y + dist * Math.sin(c.pitch),
      c.target.z + dist * cp * Math.cos(c.yaw),
    );
  }

  /** Cell under the pointer via raycasting against the 9 cell tiles, or −1. */
  pick(clientX: number, clientY: number): number {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return -1;
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, 1 - ((clientY - r.top) / r.height) * 2);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.cells, false)[0];
    return hit ? (hit.object.userData.cell as number) : -1;
  }

  /** Screen position (CSS px, relative to the canvas) of a cell centre — handy for tests and overlays. */
  cellScreenPosition(i: number): { x: number; y: number } {
    const v = new THREE.Vector3(cellX(i), BOARD_TOP, cellZ(i)).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  private canHover() {
    return !!this.view && this.view.interactive;
  }

  private bindInput() {
    const c = this.canvas;
    let drag: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
    const clampPitch = (p: number) => Math.min(1.35, Math.max(0.16, p));
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
        this.hover = this.pick(ev.clientX, ev.clientY);
        const v = this.view;
        const can = this.hover >= 0 && this.canHover() && !!v && !v.board[this.hover];
        c.style.cursor = can ? 'pointer' : 'grab';
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (drag && !drag.moved) {
        const i = this.pick(ev.clientX, ev.clientY);
        if (i >= 0) this.onPick(i);
      }
      drag = null;
      this.dragging = false;
      c.style.cursor = 'grab';
    };
    const onLeave = () => { if (!drag) this.hover = -1; };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      this.cam.dist = Math.min(42, Math.max(10, this.cam.dist * (1 + ev.deltaY * 0.001)));
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
    this.camera.lookAt(this.cam.target);
    this.sky.position.copy(this.camera.position);
    this.sky.material.uniforms.uTime.value = t;
    this.water.material.uniforms.uTime.value = t;

    const v = this.view;
    const line = v?.line ?? null;
    const winning = (i: number) => !!(line && line.includes(i) && now > this.winAt);
    const tc = v ? COL[v.turn] : COL.X;

    for (let i = 0; i < 9; i++) {
      // cell tile: winning pulse or hover tint in the colour of the player to move
      const m = this.cells[i].material;
      if (winning(i)) this.glow(m, COL.cell, 0.15 + 0.1 * Math.sin(t * 6), [1.05, 0.96, 0.78]);
      else if (v && i === this.hover && this.canHover() && !v.board[i]) this.glow(m, COL.cell, 0, [0.7 + tc[0] * 0.35, 0.7 + tc[1] * 0.35, 0.7 + tc[2] * 0.35]);
      else this.glow(m, COL.cell, 0);

      for (const p of ['X', 'O'] as const) this.animatePiece(p, i, now, t, winning(i));
    }

    if (line && now > this.winAt) {
      const g = Math.min(1, (now - this.winAt) / BAR_GROW_MS);
      const a0 = line[0], a2 = line[2];
      const x0 = cellX(a0), z0 = cellZ(a0), x2 = cellX(a2), z2 = cellZ(a2);
      const dx = x2 - x0, dz = z2 - z0, len = (Math.hypot(dx, dz) + 1.6) * g;
      this.bar.visible = true;
      this.bar.position.set((x0 + x2) / 2, BOARD_TOP + 0.75, (z0 + z2) / 2);
      this.bar.rotation.set(0, Math.atan2(-dz, dx), 0);
      this.bar.scale.set(Math.max(len, 1e-3), 0.16, 0.16);
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

  private animatePiece(p: Player, i: number, now: number, t: number, win: boolean) {
    const a = this.pieces[p][i], v = this.view, mesh = a.mesh, m = mesh.material;
    const present = v?.board[i] === p;
    let k = 1;
    if (!present) {
      if (!a.vanishAt) { mesh.visible = false; return; }
      k = (now - a.vanishAt) / VANISH_MS;
      if (k >= 1) { a.vanishAt = 0; mesh.visible = false; return; }
    }
    mesh.visible = true;
    // drop-in: falls from 3.4 above, grows 0.55 → 1, X spins half a turn (cubic ease-out)
    const d = a.placedAt ? Math.min(1, Math.max(0, (now - a.placedAt) / DROP_MS)) : 1;
    const ez = 1 - Math.pow(1 - d, 3);
    let y = BOARD_TOP + (1 - ez) * 3.4, sc = 0.55 + 0.45 * ez, ry = p === 'X' ? (1 - ez) * Math.PI : 0;
    let emis = 0, opacity = 1;
    if (present && win) {
      y += 0.18 + 0.12 * Math.sin(t * 5 + i);
      emis = 0.3 + 0.2 * Math.sin(t * 6);
    } else if (present && v?.vanishing === i) {
      // next to vanish: breathing transparency and a slight shrink
      opacity = 0.6 + 0.22 * Math.sin(t * 5);
      sc *= 0.92 + 0.03 * Math.sin(t * 5);
    } else if (!present) {
      // vanishing: shrink, float up, spin and fade out
      const e = k * k;
      y += e * 1.6;
      sc *= 1 - e;
      ry += e * Math.PI;
      opacity = 1 - k;
    }
    mesh.position.set(cellX(i), y, cellZ(i));
    mesh.rotation.set(0, ry, 0);
    mesh.scale.setScalar(Math.max(sc, 1e-3));
    m.opacity = opacity;
    m.depthWrite = opacity >= 0.999;
    this.glow(m, COL[p], emis);
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
    this.renderer.dispose();
    // A detached canvas will never be reused, so free its context now. Strict Mode re-runs effects on a
    // canvas that is still connected, and losing the context there would leave the scene blank.
    if (!this.canvas.isConnected) this.renderer.forceContextLoss();
  }
}
