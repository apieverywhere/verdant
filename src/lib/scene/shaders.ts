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
