'use client';

/**
 * The one AudioContext of the site and its two channels, music and sound effects, whose levels follow the
 * player's settings. Everything is synthesised on the fly: there are no audio files to download or license.
 *
 * Browsers only let audio start after the first user gesture, so the context is created on the first
 * pointerdown / keydown; until then `playSfx` does nothing and `startMusic` only remembers what to play.
 * Music pauses while the tab is hidden. Nothing here runs on the server.
 */
import { getSettings, subscribeSettings } from '../settings';

/** 0–100 slider → gain. Squared so the slider feels even to the ear. */
export const gainFor = (volume: number) => {
  const v = Math.min(100, Math.max(0, volume)) / 100;
  return v * v;
};

export interface Channels {
  ctx: AudioContext;
  music: GainNode;
  sfx: GainNode;
}

let channels: Channels | null = null;
let listening = false;
const onReady = new Set<(c: Channels) => void>();

/** The context and channels once the page has been touched; null before that. */
export const getChannels = () => channels;

/** Runs `fn` now if audio is unlocked, otherwise on the first gesture. Returns an unsubscribe. */
export function whenReady(fn: (c: Channels) => void): () => void {
  if (channels) {
    fn(channels);
    return () => {};
  }
  listen();
  onReady.add(fn);
  return () => onReady.delete(fn);
}

/** Starts listening for the first gesture. Safe to call many times. */
export function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const unlock = () => {
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    try {
      create();
    } catch {
      // No Web Audio: the games simply stay silent.
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

function create() {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const music = ctx.createGain(), sfx = ctx.createGain();
  music.connect(master);
  sfx.connect(master);
  channels = { ctx, music, sfx };

  const applyVolumes = () => {
    const s = getSettings(), t = ctx.currentTime;
    music.gain.setTargetAtTime(gainFor(s.music), t, 0.05);
    sfx.gain.setTargetAtTime(gainFor(s.sfx), t, 0.02);
  };
  music.gain.value = gainFor(getSettings().music);
  sfx.gain.value = gainFor(getSettings().sfx);
  subscribeSettings(applyVolumes);

  // Browsers pause rendering for hidden tabs anyway; suspending makes it explicit and saves CPU on the others.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });

  void ctx.resume();
  onReady.forEach((fn) => fn(channels!));
  onReady.clear();
}
