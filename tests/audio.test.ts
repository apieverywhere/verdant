import { describe, expect, test } from 'bun:test';
import { gainFor } from '../src/lib/audio/engine';
import { leadNotes, nextLeadNote, THEMES } from '../src/lib/audio/music';
import { renderSfx, SFX_NAMES } from '../src/lib/audio/sfx';

describe('A1 — audio settings and themes', () => {
  test('the volume curve is silent at 0, full at 100 and rises monotonically', () => {
    expect(gainFor(0)).toBe(0);
    expect(gainFor(100)).toBe(1);
    expect(gainFor(-5)).toBe(0);
    expect(gainFor(250)).toBe(1);
    let last = -1;
    for (let v = 0; v <= 100; v += 5) {
      const g = gainFor(v);
      expect(g).toBeGreaterThan(last);
      last = g;
    }
  });

  test('every theme has a pentatonic lead scale and four chords whose notes sit in the key', () => {
    for (const theme of Object.values(THEMES)) {
      expect(theme.scale).toHaveLength(5);
      expect(theme.chords).toHaveLength(4);
      expect(theme.bar).toBeGreaterThanOrEqual(8);
      // Chord tones: within the key's diatonic set (major or natural minor), so pad and lead never clash.
      const major = new Set([0, 2, 4, 5, 7, 9, 11]), minor = new Set([0, 2, 3, 5, 7, 8, 10]);
      const key = theme.scale.includes(3) ? minor : major;
      for (const chord of theme.chords) for (const semi of chord) expect(key.has(((semi % 12) + 12) % 12)).toBe(true);
    }
  });

  test('the lead wanders the scale without ever leaving it', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
    for (const theme of Object.values(THEMES)) {
      const notes = leadNotes(theme);
      expect(notes).toHaveLength(10);
      let i = 5;
      const visited = new Set<number>();
      for (let n = 0; n < 500; n++) {
        i = nextLeadNote(i, notes.length, random);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(notes.length);
        visited.add(i);
      }
      expect(visited.size).toBeGreaterThan(6); // it moves around rather than sticking to one note
    }
  });
});

/** Just enough of Web Audio for the effects to build on: every node records whether it was started and connected. */
function mockContext() {
  const log = { oscillators: 0, started: 0, connected: 0, errors: [] as string[] };
  const param = () => {
    const p = { value: 0 } as Record<string, unknown>;
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) {
      p[m] = (v: number) => {
        if (m === 'exponentialRampToValueAtTime' && !(v > 0)) log.errors.push(`exponential ramp to ${v}`);
        if (!Number.isFinite(v)) log.errors.push(`${m}(${v})`);
        return p;
      };
    }
    return p;
  };
  const node = (extra: Record<string, unknown> = {}) => ({
    connect(n: unknown) { log.connected++; return n; },
    disconnect() {},
    start(t?: number) { log.started++; if (t !== undefined && !(t >= 0)) log.errors.push(`start(${t})`); },
    stop(t?: number) { if (t !== undefined && !(t >= 0)) log.errors.push(`stop(${t})`); },
    ...extra,
  });
  const ctx = {
    currentTime: 10,
    sampleRate: 48000,
    state: 'running',
    createOscillator: () => { log.oscillators++; return node({ type: 'sine', frequency: param(), detune: param() }); },
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(), Q: param() }),
    createBufferSource: () => node({ buffer: null, loop: false, playbackRate: param() }),
    createBuffer: (ch: number, len: number, rate: number) => ({ sampleRate: rate, length: len, getChannelData: () => new Float32Array(len) }),
  } as unknown as AudioContext;
  return { ctx, out: node() as unknown as AudioNode, log };
}

describe('A1.3 — every effect builds', () => {
  for (const name of SFX_NAMES) {
    test(`${name} schedules nodes without errors`, () => {
      const { ctx, out, log } = mockContext();
      renderSfx(name, ctx, out);
      expect(log.errors).toEqual([]);
      expect(log.started).toBeGreaterThan(0);
      expect(log.connected).toBeGreaterThan(0);
    });
  }

  test('the victory fanfare is a layered piece, not a single blip', () => {
    const { ctx, out, log } = mockContext();
    renderSfx('win', ctx, out);
    expect(log.oscillators).toBeGreaterThan(30);
  });
});
