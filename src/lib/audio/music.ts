'use client';

/**
 * Generative ambient music, one theme per scene. A theme is a slow chord cycle on a soft pad, a sparse lead
 * that wanders a pentatonic scale, and a bed of filtered noise shaped like the scene's weather (wind, ice,
 * water, a forest at dawn). Notes are scheduled a little ahead of the clock from a timer, so the music keeps
 * time while the 3D scene is busy. Nothing repeats exactly; the only file is a short wind recording.
 *
 * `THEMES` and `nextLeadNote` are pure and unit-tested; `startMusic` needs a browser.
 */
import { whenReady, type Channels } from './engine';

export type ThemeId = 'sunset' | 'moon' | 'lagoon' | 'forest';

export interface Theme {
  /** MIDI note of the key's root. */
  root: number;
  /** Lead scale, semitones from the root within one octave. */
  scale: number[];
  /** Chord cycle, semitones from the root (may go below 0 or above 12). */
  chords: number[][];
  /** Seconds per chord. */
  bar: number;
  pad: { type: OscillatorType; cutoff: number; gain: number };
  lead: { voice: 'pluck' | 'bell' | 'flute'; octave: number; step: number; density: number; gain: number };
  ambience: 'wind' | 'ice' | 'water' | 'forest';
}

export const THEMES: Record<ThemeId, Theme> = {
  // Lantern Line: a warm evening in A major; kalimba-like plucks.
  sunset: {
    root: 57,
    scale: [0, 2, 4, 7, 9],
    chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [-5, -1, 2, 7]],
    bar: 9,
    pad: { type: 'triangle', cutoff: 900, gain: 0.05 },
    lead: { voice: 'pluck', octave: 1, step: 0.55, density: 0.32, gain: 0.11 },
    ambience: 'wind',
  },
  // Ember & Tide: a cold night in D minor; glassy bells far apart.
  moon: {
    root: 50,
    scale: [0, 3, 5, 7, 10],
    chords: [[0, 3, 7, 10, 14], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5, 8]],
    bar: 11,
    pad: { type: 'sine', cutoff: 700, gain: 0.07 },
    lead: { voice: 'bell', octave: 2, step: 0.8, density: 0.2, gain: 0.07 },
    ambience: 'ice',
  },
  // Tidepool: golden hour in F major; marimba over lapping water.
  lagoon: {
    root: 53,
    scale: [0, 2, 4, 7, 9],
    chords: [[0, 4, 7, 11, 14], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 12, 14, 17]],
    bar: 8,
    pad: { type: 'triangle', cutoff: 1100, gain: 0.045 },
    lead: { voice: 'pluck', octave: 1, step: 0.4, density: 0.38, gain: 0.1 },
    ambience: 'water',
  },
  // Canopy: dawn in G major; a breathy flute, birds waking up.
  forest: {
    root: 55,
    scale: [0, 2, 4, 7, 9],
    chords: [[0, 4, 7, 14], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 12, 14, 19]],
    bar: 9,
    pad: { type: 'sine', cutoff: 1300, gain: 0.06 },
    lead: { voice: 'flute', octave: 1, step: 0.6, density: 0.28, gain: 0.09 },
    ambience: 'forest',
  },
};

/** Lead range: two octaves of the scale, as indices into that list. */
export const leadNotes = (t: Theme) => [0, 1].flatMap((oct) => t.scale.map((s) => t.root + 12 * (t.lead.octave + oct) + s));

/** Mostly stepwise motion, the odd leap, never off the scale. `prev` is an index into `leadNotes`. */
export function nextLeadNote(prev: number, count: number, random: () => number): number {
  const steps = [-2, -1, -1, -1, 0, 1, 1, 1, 2, 3];
  let i = prev + steps[Math.floor(random() * steps.length)];
  if (i < 0) i = 1;
  if (i >= count) i = count - 2;
  return i;
}

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

// ---------------------------------------------------------------- player

let current: { id: ThemeId; stop: () => void } | null = null;
let wanted: ThemeId | null = null;
let unsubscribe: (() => void) | null = null;

/** Plays the theme until `stopMusic`; waits for the first gesture if audio is not unlocked yet. */
export function startMusic(id: ThemeId) {
  if (current?.id === id) return;
  wanted = id;
  current?.stop();
  current = null;
  unsubscribe?.();
  unsubscribe = whenReady((c) => {
    if (wanted !== id) return;
    try {
      current = { id, stop: play(c, THEMES[id]) };
    } catch {
      // Without Web Audio the game stays silent.
    }
  });
}

/**
 * Root for the victory fanfare, in Hz: an octave above the playing theme's key, and for a minor theme its
 * relative major, so the fanfare sits on the pad instead of clashing with it. C5 when no music is playing.
 */
export function fanfareRootHz(): number {
  const theme = current ? THEMES[current.id] : null;
  if (!theme) return 523.25;
  const minor = theme.scale.includes(3);
  return midiHz(theme.root + 12 + (minor ? 3 : 0));
}

export function stopMusic() {
  wanted = null;
  unsubscribe?.();
  unsubscribe = null;
  current?.stop();
  current = null;
}

function play({ ctx, music }: Channels, theme: Theme): () => void {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 4);
  bus.connect(music);

  // A small space: two feedback delays under a low-pass, fed by the lead and a little of the pad.
  const space = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  for (const [time, fb] of [[0.31, 0.38], [0.47, 0.32]] as const) {
    const d = ctx.createDelay(1), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    d.delayTime.value = time;
    g.gain.value = fb;
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    space.connect(d).connect(lp).connect(g).connect(d);
    g.connect(wet);
  }
  wet.connect(bus);

  const padOut = ctx.createGain();
  padOut.connect(bus);
  const padSend = ctx.createGain();
  padSend.gain.value = 0.25;
  padOut.connect(padSend).connect(space);

  const stopAmbience = ambience(ctx, bus, theme.ambience);

  const notes = leadNotes(theme);
  let chord = 0, leadIx = Math.floor(notes.length / 2), lastLeadAt = -Infinity;
  let nextBar = ctx.currentTime + 0.1, nextStep = ctx.currentTime + theme.bar * 0.4;
  const LOOKAHEAD = 0.6;
  let stopped = false, wasSilent = false;

  const tick = () => {
    if (stopped || ctx.state !== 'running') return;
    // With the music slider at 0 nothing is built, only the clock moves on; turning it up brings the
    // current chord in at once instead of waiting for the next bar.
    const silent = music.gain.value < 0.001;
    const horizon = ctx.currentTime + LOOKAHEAD;
    if (wasSilent && !silent && chord > 0) padChord(ctx, padOut, theme, theme.chords[(chord - 1) % theme.chords.length], ctx.currentTime + 0.05);
    wasSilent = silent;
    while (nextBar < horizon) {
      if (!silent) padChord(ctx, padOut, theme, theme.chords[chord % theme.chords.length], nextBar);
      chord++;
      nextBar += theme.bar;
    }
    while (nextStep < horizon) {
      // Density rises a little towards the end of each bar, so phrases lead into the chord change.
      const inBar = ((nextStep - (nextBar - theme.bar)) / theme.bar + 1) % 1;
      const p = theme.lead.density * (0.7 + 0.6 * inBar);
      if (!silent && Math.random() < p && nextStep - lastLeadAt > theme.lead.step * 0.9) {
        leadIx = nextLeadNote(leadIx, notes.length, Math.random);
        lead(ctx, bus, space, theme, midiHz(notes[leadIx]), nextStep);
        lastLeadAt = nextStep;
      }
      nextStep += theme.lead.step;
    }
  };
  tick();
  const timer = setInterval(tick, 200);

  return () => {
    stopped = true;
    clearInterval(timer);
    const t = ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    setTimeout(() => {
      stopAmbience();
      bus.disconnect();
    }, 1400);
  };
}

/** One chord of the pad: a detuned pair per note, slow swell in and out, overlapping the next chord. */
function padChord(ctx: AudioContext, out: AudioNode, theme: Theme, chord: number[], at: number) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = theme.pad.cutoff;
  const env = ctx.createGain();
  const dur = theme.bar + 3;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(theme.pad.gain, at + 2.5);
  env.gain.setValueAtTime(theme.pad.gain, at + dur - 3);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  lp.connect(env).connect(out);
  for (const semi of chord) {
    for (const detune of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = theme.pad.type;
      o.frequency.value = midiHz(theme.root + semi);
      o.detune.value = detune;
      o.connect(lp);
      o.start(at);
      o.stop(at + dur + 0.1);
    }
  }
}

function lead(ctx: AudioContext, out: AudioNode, space: AudioNode, theme: Theme, hz: number, at: number) {
  const { voice, gain } = theme.lead;
  const env = ctx.createGain();
  env.connect(out);
  const send = ctx.createGain();
  send.gain.value = 0.8;
  env.connect(send).connect(space);
  const o = ctx.createOscillator();
  o.frequency.value = hz;
  let dur: number;
  if (voice === 'pluck') {
    o.type = 'triangle';
    dur = 0.9;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    // A touch of the second partial gives the kalimba / marimba click.
    const h = ctx.createOscillator(), hg = ctx.createGain();
    h.frequency.value = hz * 2.01;
    hg.gain.setValueAtTime(gain * 0.3, at);
    hg.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    h.connect(hg).connect(out);
    h.start(at);
    h.stop(at + 0.15);
  } else if (voice === 'bell') {
    o.type = 'sine';
    dur = 2.4;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const h = ctx.createOscillator(), hg = ctx.createGain();
    h.frequency.value = hz * 2.76;
    hg.gain.setValueAtTime(gain * 0.25, at);
    hg.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    h.connect(hg).connect(out);
    h.start(at);
    h.stop(at + 0.55);
  } else {
    o.type = 'sine';
    dur = 1.1 + Math.random() * 0.6;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.09);
    env.gain.setValueAtTime(gain, at + dur - 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    // Breath: a whisper of noise under the tone, and a slow vibrato.
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5;
    vg.gain.value = hz * 0.006;
    vib.connect(vg).connect(o.frequency);
    vib.start(at);
    vib.stop(at + dur);
  }
  o.connect(env);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/**
 * The wind bed is a recording ("Wind Blowing" by SoundReality, Pixabay Content License; see README), looped
 * seamlessly and decoded once. Water is still synthesised. Should the file not load, the synthesised bed is used.
 */
const WIND_URL = '/audio/wind.mp3';
let windBuffer: Promise<AudioBuffer | null> | null = null;
const loadWind = (ctx: AudioContext) =>
  (windBuffer ??= fetch(WIND_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
    .then((b) => ctx.decodeAudioData(b))
    .catch(() => null));

/** Brown-ish noise, 4 s looped: softer than white, close to wind and water. */
function noiseBed(ctx: AudioContext): AudioBufferSourceNode {
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

/** The scene's weather: the wind recording (or noise for water) under a slowly moving filter, plus a few touches per kind. */
function ambience(ctx: AudioContext, out: AudioNode, kind: Theme['ambience']): () => void {
  const recorded = kind !== 'water';
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  // The recording keeps its own character, so its filter sits high: the ice lake brightest, the forest softest.
  const base = recorded ? { wind: 2200, ice: 3200, water: 0, forest: 1700 }[kind] : 420;
  f.frequency.value = base;
  f.Q.value = 0.5;
  const g = ctx.createGain();
  g.gain.value = recorded ? { wind: 0.55, ice: 0.5, water: 0, forest: 0.42 }[kind] : 0.09;
  f.connect(g).connect(out);

  let src: AudioBufferSourceNode | null = null, cancelled = false;
  const startNoise = () => {
    src = noiseBed(ctx);
    src.connect(f);
    src.start();
  };
  if (!recorded) startNoise();
  else {
    void loadWind(ctx).then((buf) => {
      if (cancelled) return;
      if (!buf) {
        // Fallback: the synthesised bed needs a lower cutoff and a lower level to sit like the recording.
        f.frequency.value = 500;
        g.gain.value = 0.06;
        return startNoise();
      }
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(f);
      src.start(0, Math.random() * buf.duration);
    });
  }

  // Slow drift of the filter (gusts), and for water a swell in level (waves).
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = kind === 'water' ? 0.11 : 0.05;
  lg.gain.value = base * (recorded ? 0.3 : 0.5);
  lfo.connect(lg).connect(f.frequency);
  lfo.start();
  const wave = ctx.createOscillator(), wg = ctx.createGain();
  if (kind === 'water') {
    wave.frequency.value = 0.09;
    wg.gain.value = g.gain.value * 0.5;
    wave.connect(wg).connect(g.gain);
    wave.start();
  }

  // Birds at dawn: short, random chirps, high and quiet.
  let birds: ReturnType<typeof setInterval> | undefined;
  if (kind === 'forest') {
    birds = setInterval(() => {
      if (ctx.state !== 'running' || Math.random() > 0.45) return;
      const at = ctx.currentTime + Math.random() * 0.5, n = 1 + Math.floor(Math.random() * 3);
      const f0 = 2400 + Math.random() * 1600;
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator(), e = ctx.createGain(), t = at + i * 0.13;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.3), t + 0.06);
        o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.1);
        e.gain.setValueAtTime(0.0001, t);
        e.gain.exponentialRampToValueAtTime(0.025, t + 0.015);
        e.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        o.connect(e).connect(out);
        o.start(t);
        o.stop(t + 0.13);
      }
    }, 1800);
  }

  return () => {
    cancelled = true;
    clearInterval(birds);
    [src, lfo, wave].forEach((n) => {
      try {
        n?.stop();
      } catch {
        // never started (wave on non-water themes)
      }
    });
    g.disconnect();
  };
}
