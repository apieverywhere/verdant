/** Custom shaders ported from the design: the sunset sky dome and the rippling, reflective lake. */
import { ShaderMaterial, BackSide, Vector3 } from 'three';
import type { RGB } from './geometry';

const v3 = (c: RGB | readonly number[]) => new Vector3(c[0], c[1], c[2]);

export function skyMaterial(c: { sun: readonly number[]; top: RGB; mid: RGB; hor: RGB; fog: RGB; sunCol: RGB }) {
  return new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uSun: { value: v3(c.sun) },
      uTop: { value: v3(c.top) },
      uMid: { value: v3(c.mid) },
      uHor: { value: v3(c.hor) },
      uFogCol: { value: v3(c.fog) },
      uSunCol: { value: v3(c.sunCol) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uSun, uTop, uMid, uHor, uFogCol, uSunCol;
      uniform float uTime;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uFogCol, uHor, smoothstep(-0.03, 0.05, h));
        col = mix(col, uMid, smoothstep(0.05, 0.32, h));
        col = mix(col, uTop, smoothstep(0.32, 0.85, h));
        float s = max(dot(d, uSun), 0.0);
        col += uSunCol * (pow(s, 900.0) * 2.2 + pow(s, 28.0) * 0.32 + pow(s, 5.0) * 0.14) * smoothstep(-0.06, 0.02, h);
        // twinkling stars in the upper sky
        vec3 c = floor(d * 260.0);
        float st = hash(c);
        col += vec3(1.0, 0.96, 0.9) * step(0.9968, st) * smoothstep(0.22, 0.7, h) * (0.55 + 0.45 * sin(uTime * 2.0 + st * 300.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/** Night sky of the ice lake: a hard moon disc, an aurora band and denser stars. */
export function moonSkyMaterial(c: { moon: readonly number[]; top: RGB; mid: RGB; hor: RGB; fog: RGB; moonCol: RGB }) {
  return new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uSun: { value: v3(c.moon) },
      uTop: { value: v3(c.top) },
      uMid: { value: v3(c.mid) },
      uHor: { value: v3(c.hor) },
      uFogCol: { value: v3(c.fog) },
      uSunCol: { value: v3(c.moonCol) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uSun, uTop, uMid, uHor, uFogCol, uSunCol;
      uniform float uTime;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uFogCol, uHor, smoothstep(-0.03, 0.05, h));
        col = mix(col, uMid, smoothstep(0.05, 0.3, h));
        col = mix(col, uTop, smoothstep(0.3, 0.8, h));
        float s = max(dot(d, uSun), 0.0);
        col += uSunCol * (smoothstep(0.99955, 0.9997, s) * 1.4 + pow(s, 60.0) * 0.25 + pow(s, 8.0) * 0.08);
        // aurora: two slow sine curtains confined to a band above the horizon
        float band = smoothstep(0.12, 0.3, h) * (1.0 - smoothstep(0.42, 0.72, h));
        float wv = 0.5 + 0.5 * sin(d.x * 7.0 + sin(d.z * 4.0 + uTime * 0.18) * 2.2 + uTime * 0.12);
        float wv2 = 0.5 + 0.5 * sin(d.z * 9.0 - d.x * 3.0 + uTime * 0.09);
        col += vec3(0.18, 0.95, 0.62) * band * pow(wv, 3.0) * 0.32 + vec3(0.45, 0.3, 0.95) * band * pow(wv2, 4.0) * 0.16;
        vec3 c = floor(d * 260.0);
        float st = hash(c);
        col += vec3(0.92, 0.95, 1.0) * step(0.9955, st) * smoothstep(0.08, 0.5, h) * (0.55 + 0.45 * sin(uTime * 2.0 + st * 300.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export function waterMaterial(c: {
  base: RGB; light: readonly number[]; sunCol: readonly number[]; skyCol: readonly number[]; gndCol: readonly number[];
  fog: RGB; fogDensity: number; spec: number;
}) {
  return new ShaderMaterial({
    uniforms: {
      uBase: { value: v3(c.base) },
      uLight: { value: v3(c.light) },
      uSunCol: { value: v3(c.sunCol) },
      uSkyCol: { value: v3(c.skyCol) },
      uGndCol: { value: v3(c.gndCol) },
      uFogCol: { value: v3(c.fog) },
      uFog: { value: c.fogDensity },
      uSpec: { value: c.spec },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uLight, uSunCol, uSkyCol, uGndCol, uFogCol;
      uniform float uFog, uSpec, uTime;
      varying vec3 vWorld;
      void main() {
        // animated ripple normal
        vec3 n = normalize(vec3(
          sin(vWorld.x * 0.9 + uTime * 1.3) * 0.05 + sin(vWorld.z * 1.7 - uTime * 0.8) * 0.035,
          1.0,
          cos(vWorld.z * 0.8 + uTime * 1.1) * 0.05 + sin(vWorld.x * 1.9 + uTime) * 0.03));
        vec3 V = normalize(cameraPosition - vWorld);
        float dif = max(dot(n, uLight), 0.0);
        vec3 hemi = mix(uGndCol, uSkyCol, n.y * 0.5 + 0.5);
        vec3 col = uBase * (hemi + uSunCol * dif);
        vec3 R = reflect(-uLight, n);
        float s = pow(max(dot(R, V), 0.0), 60.0);
        float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        col = mix(col, uFogCol * 1.05, fr * 0.7);
        col += uSunCol * s * uSpec;
        float d = length(cameraPosition - vWorld);
        float f = 1.0 - exp(-pow(d * uFog, 2.0));
        gl_FragColor = vec4(mix(col, uFogCol, clamp(f, 0.0, 1.0)), 1.0);
      }`,
  });
}

/**
 * Tidepool lagoon: turquoise shallows around the dais (radius `shore`) that deepen further out, drifting caustics,
 * fine sun glitter and foam lapping at the shore.
 */
export function lagoonWaterMaterial(c: {
  deep: RGB; shallow: RGB; foam: RGB; light: readonly number[]; sun: readonly number[]; sunCol: readonly number[];
  skyCol: readonly number[]; gndCol: readonly number[]; fog: RGB; fogDensity: number; shore: number;
}) {
  return new ShaderMaterial({
    uniforms: {
      uDeep: { value: v3(c.deep) },
      uShallow: { value: v3(c.shallow) },
      uFoam: { value: v3(c.foam) },
      uLight: { value: v3(c.light) },
      uSun: { value: v3(c.sun) },
      uSunCol: { value: v3(c.sunCol) },
      uSkyCol: { value: v3(c.skyCol) },
      uGndCol: { value: v3(c.gndCol) },
      uFogCol: { value: v3(c.fog) },
      uFog: { value: c.fogDensity },
      uShore: { value: c.shore },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uDeep, uShallow, uFoam, uLight, uSun, uSunCol, uSkyCol, uGndCol, uFogCol;
      uniform float uFog, uShore, uTime;
      varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      // thin bright web of light, as on the floor of shallow water
      float caustic(vec2 p, float t) {
        vec2 q = p;
        for (int i = 1; i <= 3; i++) {
          float f = float(i);
          q += vec2(sin(q.y * 1.3 + t * 0.5 * f), cos(q.x * 1.5 - t * 0.4 * f)) * 0.55;
        }
        return pow(1.0 - abs(sin(q.x * 1.4) * sin(q.y * 1.4)), 5.0);
      }
      void main() {
        vec2 p = vWorld.xz;
        float r = length(p), t = uTime, d = r - uShore;
        // ripple normal: four crossing wave trains
        vec2 g = vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 0.9 + t * 1.2) * 0.045;
        g += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 1.7 - t * 0.9) * 0.035;
        g += vec2(0.2, -0.98) * cos(dot(p, vec2(0.2, -0.98)) * 3.1 + t * 1.6) * 0.022;
        g += vec2(-0.9, -0.3) * cos(dot(p, vec2(-0.9, -0.3)) * 5.3 + t * 2.1) * 0.014;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(cameraPosition - vWorld);

        float shallow = max(1.0 - smoothstep(0.0, 10.0, d), 0.75 * smoothstep(21.0, 29.0, r));
        vec3 base = mix(uDeep, uShallow, shallow);
        base += uShallow * caustic(p * 0.5, t) * (0.05 + 0.2 * shallow);

        vec3 hemi = mix(uGndCol, uSkyCol, n.y * 0.5 + 0.5);
        vec3 col = base * (hemi + uSunCol * max(dot(n, uLight), 0.0));
        float fr = pow(1.0 - max(dot(n, V), 0.0), 4.0);
        col = mix(col, uFogCol, fr * 0.55);
        float glint = pow(max(dot(reflect(-uLight, n), V), 0.0), 220.0);
        float path = pow(max(dot(reflect(-uSun, n), V), 0.0), 40.0);
        col += uSunCol * (glint * 0.9 + path * 0.5);

        // foam: a broken white edge at the shore and fading rings that lap towards it
        float wob = (noise(p * 0.9 + t * 0.15) - 0.5) * 0.9;
        float edge = 1.0 - smoothstep(0.1, 0.65, d + wob);
        float rings = smoothstep(0.72, 1.0, sin((d + wob) * 3.2 + t * 0.8)) * (1.0 - smoothstep(0.5, 4.2, d)) * noise(p * 2.3 - t * 0.2);
        col = mix(col, uFoam, clamp(edge * 0.85 + rings * 0.65, 0.0, 1.0));

        float dist = length(cameraPosition - vWorld);
        float f = 1.0 - exp(-pow(dist * uFog, 2.0));
        gl_FragColor = vec4(mix(col, uFogCol, clamp(f, 0.0, 1.0)), 1.0);
      }`,
  });
}

/**
 * Ember & Tide ice lake: dark water that mirrors the aurora, moon glitter, a cracked ice shelf round the island
 * (radius `shore`) and broken sheets of ice towards the far shore.
 */
export function iceLakeMaterial(c: {
  deep: RGB; shallow: RGB; ice: RGB; light: readonly number[]; moonCol: readonly number[];
  skyCol: readonly number[]; gndCol: readonly number[]; fog: RGB; fogDensity: number; shore: number;
}) {
  return new ShaderMaterial({
    uniforms: {
      uDeep: { value: v3(c.deep) },
      uShallow: { value: v3(c.shallow) },
      uIce: { value: v3(c.ice) },
      uLight: { value: v3(c.light) },
      uMoonCol: { value: v3(c.moonCol) },
      uSkyCol: { value: v3(c.skyCol) },
      uGndCol: { value: v3(c.gndCol) },
      uFogCol: { value: v3(c.fog) },
      uFog: { value: c.fogDensity },
      uShore: { value: c.shore },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uDeep, uShallow, uIce, uLight, uMoonCol, uSkyCol, uGndCol, uFogCol;
      uniform float uFog, uShore, uTime;
      varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      void main() {
        vec2 p = vWorld.xz;
        float r = length(p), t = uTime, d = r - uShore;
        vec2 g = vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 0.8 + t * 0.9) * 0.04;
        g += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 1.6 - t * 0.7) * 0.03;
        g += vec2(0.2, -0.98) * cos(dot(p, vec2(0.2, -0.98)) * 3.3 + t * 1.2) * 0.016;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(cameraPosition - vWorld);

        float shallow = 1.0 - smoothstep(0.0, 7.0, d);
        vec3 base = mix(uDeep, uShallow, shallow * 0.8);
        vec3 hemi = mix(uGndCol, uSkyCol, n.y * 0.5 + 0.5);
        vec3 col = base * (hemi + uMoonCol * max(dot(n, uLight), 0.0));

        // the aurora overhead, mirrored in slow curtains of green and violet
        vec3 R = reflect(-V, n);
        float wv = 0.5 + 0.5 * sin(R.x * 7.0 + sin(R.z * 4.0 + t * 0.18) * 2.2 + t * 0.12 + p.x * 0.05);
        float wv2 = 0.5 + 0.5 * sin(R.z * 9.0 - R.x * 3.0 + t * 0.09 + p.y * 0.04);
        float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        col += (vec3(0.18, 0.95, 0.62) * pow(wv, 3.0) * 0.2 + vec3(0.45, 0.3, 0.95) * pow(wv2, 4.0) * 0.12) * (0.35 + fr);
        col = mix(col, uFogCol * 1.3, fr * 0.5);
        col += uMoonCol * pow(max(dot(reflect(-uLight, n), V), 0.0), 240.0) * 1.1;

        // ice: a shelf frozen to the island, loose sheets further out; cracks show the dark water
        float wob = (noise(p * 0.7) - 0.5) * 1.6;
        float shelf = 1.0 - smoothstep(0.7, 1.1, d + wob);
        float sheets = smoothstep(0.56, 0.6, noise(p * 0.22 + 7.0)) * smoothstep(3.0, 6.0, d);
        float ice = max(shelf, sheets);
        float crack = smoothstep(0.0, 0.035, abs(noise(p * 1.9) - 0.5)) * smoothstep(0.0, 0.03, abs(noise(p * 0.9 + 13.0) - 0.5));
        vec3 iceCol = uIce * (0.8 + 0.25 * noise(p * 3.0)) * (hemi + uMoonCol * max(dot(vec3(0.0, 1.0, 0.0), uLight), 0.0)) * (0.55 + 0.45 * crack);
        col = mix(col, iceCol, ice * 0.92);

        float dist = length(cameraPosition - vWorld);
        float f = 1.0 - exp(-pow(dist * uFog, 2.0));
        gl_FragColor = vec4(mix(col, uFogCol, clamp(f, 0.0, 1.0)), 1.0);
      }`,
  });
}
