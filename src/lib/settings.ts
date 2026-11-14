'use client';

/**
 * Player settings: interface language plus music and sound-effect volumes (0–100).
 * Stored per browser in localStorage like the last-played game; when storage is unavailable the defaults are
 * used and changes last only until the page reloads. The server render always uses the defaults (English).
 *
 * The volumes are saved now so players can set them once; the games have no audio yet, and the audio code
 * will read them from here when it lands.
 */
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'vi';
export const LANGS: readonly Lang[] = ['en', 'vi'];

export interface Settings {
  lang: Lang;
  music: number;
  sfx: number;
}

const KEY = 'verdant:settings';
export const DEFAULT_SETTINGS: Settings = { lang: 'en', music: 70, sfx: 80 };

const listeners = new Set<() => void>();
/** Settings changed this session; used when storage can't be written, so the change still applies. */
let memory: Settings | null = null;
/** Last parsed value, kept so useSyncExternalStore gets the same object until the stored text changes. */
let cache: { raw: string | null; value: Settings } | null = null;

const clampVolume = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;

/** First visit: follow the browser's language if it is Vietnamese. */
function browserLang(): Lang {
  try {
    return navigator.languages?.some((l) => l.toLowerCase().startsWith('vi')) ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

function parse(raw: string | null): Settings {
  let saved: Partial<Settings> = {};
  try {
    if (raw) saved = JSON.parse(raw) ?? {};
  } catch {
    saved = {};
  }
  return {
    lang: LANGS.includes(saved.lang as Lang) ? (saved.lang as Lang) : browserLang(),
    music: clampVolume(saved.music, DEFAULT_SETTINGS.music),
    sfx: clampVolume(saved.sfx, DEFAULT_SETTINGS.sfx),
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getSettings(): Settings {
  if (memory) return memory;
  const raw = readRaw();
  if (!cache || cache.raw !== raw) cache = { raw, value: parse(raw) };
  return cache.value;
}

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch };
  next.music = clampVolume(next.music, DEFAULT_SETTINGS.music);
  next.sfx = clampVolume(next.sfx, DEFAULT_SETTINGS.sfx);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    memory = null;
  } catch {
    memory = next;
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // A change made in another tab applies here too.
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
