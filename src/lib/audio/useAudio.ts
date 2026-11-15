'use client';

/** React bindings: a scene's music for the life of a game page, and an effect player for its events. */
import { useCallback, useEffect, useRef } from 'react';
import { listen } from './engine';
import { startMusic, stopMusic, type ThemeId } from './music';
import { playSfx, type SfxName } from './sfx';

/** Plays the theme while the component is mounted; the lobby, which has no music, never calls this. */
export function useMusic(theme: ThemeId) {
  useEffect(() => {
    startMusic(theme);
    return stopMusic;
  }, [theme]);
}

/** `play(name)`; starts listening for the unlocking gesture so the first click can already make a sound. */
export function useSfx() {
  useEffect(listen, []);
  return useCallback((name: SfxName, delayMs = 0) => {
    if (delayMs) setTimeout(() => playSfx(name), delayMs);
    else playSfx(name);
  }, []);
}

/**
 * Runs `fn(current, previous)` whenever `value` changes, skipping the mount. For reacting to game state
 * transitions (a move was played, a round ended) without threading audio through the reducers.
 */
export function useOnChange<T>(value: T, fn: (current: T, previous: T) => void) {
  const prev = useRef(value);
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    const was = prev.current;
    prev.current = value;
    cb.current(value, was);
  }, [value]);
}
