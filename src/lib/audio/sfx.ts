'use client';

/**
 * Synthesised sound effects, one short function each. They are built from two primitives, a tone with an
 * envelope (optionally gliding in pitch) and a burst of filtered noise, so every effect is a few lines and
 * costs nothing to load. Levels are balanced against each other here; the player's volume is on the channel.
 */
import { getChannels } from './engine';
import { fanfareRootHz } from './music';

export type SfxName =
  | 'tap' // a button or a selection
  | 'place' // Lantern Line: a piece set down on the board
  | 'vanish' // Lantern Line: the oldest piece fades away
  | 'drop' // Ember & Tide: a piece falls and lands on the stack
  | 'slide' // Tidepool: marbles roll one hole
  | 'clack' // Tidepool: a push, marble against marble
  | 'splash' // Tidepool: a marble falls into the sea
  | 'hop' // Canopy: a climber steps
  | 'grow' // Canopy: a tile grows a stage
  | 'cut' // Canopy: a tree is cut back
  | 'lantern' // Canopy: a lantern is lit or taken
  | 'win'
  | 'lose'
  | 'draw';

interface ToneOpts {
  type?: OscillatorType;
  /** Seconds to reach full level. */
  attack?: number;
  gain?: number;
  /** Frequency to glide to by the end. */
  to?: number;
  /** Start offset in seconds. */
  at?: number;
  /** Low-pass cutoff; omitted means none. */
  cutoff?: number;
}

interface NoiseOpts {
  type?: BiquadFilterType;
  freq?: number;
  /** Filter frequency to sweep to by the end. */
  to?: number;
  q?: number;
  gain?: number;
  attack?: number;
  at?: number;
}

/** 2 s of white noise, built once per context. */
let noiseBuffer: AudioBuffer | null = null;
const noiseFor = (ctx: AudioContext) => {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
};

function tone(ctx: AudioContext, out: AudioNode, freq: number, dur: number, o: ToneOpts = {}) {
  const t0 = ctx.currentTime + (o.at ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  const env = ctx.createGain();
  const peak = o.gain ?? 0.3, a = o.attack ?? 0.005;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + a);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = osc;
  if (o.cutoff) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.cutoff;
    node.connect(lp);
    node = lp;
  }
  node.connect(env).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ctx: AudioContext, out: AudioNode, dur: number, o: NoiseOpts = {}) {
  const t0 = ctx.currentTime + (o.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseFor(ctx);
  src.loop = true;
  src.playbackRate.value = 1;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'lowpass';
  f.frequency.setValueAtTime(o.freq ?? 1200, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  f.Q.value = o.q ?? 0.8;
  const env = ctx.createGain();
  const peak = o.gain ?? 0.25, a = o.attack ?? 0.003;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + a);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(env).connect(out);
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + dur + 0.02);
}

/** Bell: a carrier and a brighter partial that dies faster. */
function bell(ctx: AudioContext, out: AudioNode, freq: number, dur: number, gain = 0.2, at = 0) {
  tone(ctx, out, freq, dur, { gain, at });
  tone(ctx, out, freq * 2.76, dur * 0.35, { gain: gain * 0.35, at });
  tone(ctx, out, freq * 5.4, dur * 0.15, { gain: gain * 0.12, at });
}

/** Semitone ratio. */
const st = (n: number) => 2 ** (n / 12);

/**
 * Victory, about two seconds, in the key of the scene's music: a rising whoosh into an impact, a quick
 * arpeggio up the major chord, the full chord swelling underneath, then high sparkles and a long ringing top note.
 */
function fanfare(ctx: AudioContext, out: AudioNode, root: number) {
  // 1. Lift and impact.
  noise(ctx, out, 0.3, { type: 'bandpass', freq: 600, to: 5000, q: 1.2, gain: 0.14, attack: 0.2 });
  tone(ctx, out, root / 2, 0.5, { gain: 0.3, to: root / 4, type: 'triangle', cutoff: 500, at: 0.28 });
  noise(ctx, out, 0.08, { freq: 2500, gain: 0.18, at: 0.28 });

  // 2. Arpeggio up the chord: root, 3rd, 5th, octave, 10th; each note a detuned pair with a bright attack.
  const arp = [0, 4, 7, 12, 16];
  arp.forEach((semi, i) => {
    const hz = root * st(semi), at = 0.3 + i * 0.085, g = 0.1 + i * 0.02;
    tone(ctx, out, hz * 0.997, 0.7, { gain: g, at, type: 'triangle', cutoff: 3500 });
    tone(ctx, out, hz * 1.003, 0.7, { gain: g, at, type: 'triangle', cutoff: 3500 });
    tone(ctx, out, hz * 2, 0.18, { gain: g * 0.45, at });
  });

  // 3. The chord itself swells in under the arpeggio and holds: the "ta-da" body.
  for (const semi of [0, 4, 7, 12]) {
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), env = ctx.createGain();
      const at = ctx.currentTime + 0.55, hold = 1.1, release = 0.9;
      o.type = 'sawtooth';
      o.frequency.value = root * st(semi);
      o.detune.value = detune;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, at);
      lp.frequency.exponentialRampToValueAtTime(2600, at + 0.35);
      lp.frequency.exponentialRampToValueAtTime(700, at + hold + release);
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(0.06, at + 0.25);
      env.gain.setValueAtTime(0.06, at + hold);
      env.gain.exponentialRampToValueAtTime(0.0001, at + hold + release);
      o.connect(lp).connect(env).connect(out);
      o.start(at);
      o.stop(at + hold + release + 0.05);
    }
  }

  // 4. Sparkles two octaves up, and a shimmer of air.
  [0, 7, 12, 16, 19, 24].forEach((semi, i) => bell(ctx, out, root * 4 * st(semi), 0.6, 0.045, 0.85 + i * 0.09 + Math.random() * 0.03));
  noise(ctx, out, 1.2, { type: 'highpass', freq: 5000, to: 9000, gain: 0.03, attack: 0.3, at: 0.6 });

  // 5. The top note rings on.
  bell(ctx, out, root * 2 * st(7), 2.2, 0.12, 0.72);
  bell(ctx, out, root * 4, 1.8, 0.07, 0.9);
}

const SFX: Record<SfxName, (ctx: AudioContext, out: AudioNode) => void> = {
  tap(ctx, out) {
    noise(ctx, out, 0.05, { type: 'bandpass', freq: 2400, q: 1.5, gain: 0.12 });
    tone(ctx, out, 660, 0.06, { gain: 0.08, to: 520 });
  },
  place(ctx, out) {
    // Lacquered piece on wood: a click and a short low knock.
    noise(ctx, out, 0.04, { type: 'bandpass', freq: 3200, q: 1, gain: 0.2 });
    tone(ctx, out, 240, 0.14, { gain: 0.35, to: 150, type: 'triangle', cutoff: 900 });
  },
  vanish(ctx, out) {
    tone(ctx, out, 520, 0.6, { gain: 0.1, to: 1500, attack: 0.08 });
    tone(ctx, out, 780, 0.5, { gain: 0.06, to: 2300, attack: 0.1 });
    noise(ctx, out, 0.5, { type: 'highpass', freq: 3000, to: 8000, gain: 0.04, attack: 0.1 });
  },
  drop(ctx, out) {
    // Whistle on the way down, thud on landing.
    noise(ctx, out, 0.22, { type: 'bandpass', freq: 2600, to: 500, q: 2, gain: 0.08 });
    tone(ctx, out, 160, 0.18, { gain: 0.45, to: 70, at: 0.2, type: 'triangle', cutoff: 600 });
    noise(ctx, out, 0.05, { freq: 900, gain: 0.2, at: 0.2 });
  },
  slide(ctx, out) {
    noise(ctx, out, 0.22, { freq: 500, to: 260, gain: 0.18, attack: 0.03 });
  },
  clack(ctx, out) {
    noise(ctx, out, 0.03, { type: 'bandpass', freq: 3800, q: 1.2, gain: 0.3 });
    noise(ctx, out, 0.03, { type: 'bandpass', freq: 3200, q: 1.2, gain: 0.2, at: 0.045 });
    noise(ctx, out, 0.2, { freq: 420, to: 240, gain: 0.12, at: 0.05, attack: 0.03 });
  },
  splash(ctx, out) {
    noise(ctx, out, 0.5, { type: 'bandpass', freq: 1800, to: 300, q: 0.7, gain: 0.3, attack: 0.01 });
    tone(ctx, out, 300, 0.25, { gain: 0.12, to: 90 });
    noise(ctx, out, 0.7, { freq: 1200, to: 400, gain: 0.08, at: 0.15, attack: 0.1 });
  },
  hop(ctx, out) {
    tone(ctx, out, 420, 0.12, { gain: 0.14, to: 760, type: 'triangle' });
    noise(ctx, out, 0.06, { freq: 1500, gain: 0.08, at: 0.1 });
  },
  grow(ctx, out) {
    [392, 494, 587].forEach((f, i) => tone(ctx, out, f, 0.35, { gain: 0.1, at: i * 0.07, type: 'triangle', cutoff: 2400 }));
    noise(ctx, out, 0.35, { type: 'highpass', freq: 2500, to: 6000, gain: 0.03, attack: 0.12 });
  },
  cut(ctx, out) {
    noise(ctx, out, 0.05, { type: 'highpass', freq: 1800, gain: 0.35 });
    tone(ctx, out, 180, 0.2, { gain: 0.25, to: 80, type: 'triangle', cutoff: 700, at: 0.03 });
    noise(ctx, out, 0.25, { freq: 600, to: 200, gain: 0.1, at: 0.04, attack: 0.02 });
  },
  lantern(ctx, out) {
    bell(ctx, out, 1046, 0.9, 0.12);
    bell(ctx, out, 1568, 0.7, 0.07, 0.09);
  },
  win(ctx, out) {
    fanfare(ctx, out, fanfareRootHz());
  },
  lose(ctx, out) {
    [440, 415, 349].forEach((f, i) => tone(ctx, out, f, 0.5, { gain: 0.13, at: i * 0.22, type: 'triangle', cutoff: 1800 }));
    tone(ctx, out, 175, 0.9, { gain: 0.1, at: 0.44, type: 'sine' });
  },
  draw(ctx, out) {
    bell(ctx, out, 587, 0.6, 0.1);
    bell(ctx, out, 587, 0.8, 0.08, 0.3);
  },
};

export const SFX_NAMES = Object.keys(SFX) as SfxName[];

/** Builds and schedules an effect on any context; exposed for tests, which run it on a mock. */
export const renderSfx = (name: SfxName, ctx: AudioContext, out: AudioNode) => SFX[name](ctx, out);

/** Plays an effect right away; silently does nothing before the page's first gesture or without Web Audio. */
export function playSfx(name: SfxName) {
  const c = getChannels();
  if (!c || c.ctx.state !== 'running' || c.sfx.gain.value <= 0.0001) return;
  try {
    renderSfx(name, c.ctx, c.sfx);
  } catch {
    // An effect failing to build must never break the game.
  }
}
