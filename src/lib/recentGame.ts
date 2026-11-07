'use client';

/**
 * Remembers the game this browser played last, so the lobby's Play buttons can return to it.
 * Stored per browser in localStorage; storage may be unavailable (private mode, blocked site data), in which
 * case every read falls back to the default game and writes are silently dropped.
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_GAME, gameById, type Game, type GameId } from './games';

const KEY = 'verdant:last-game';
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberGame(id: GameId) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    return;
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab playing a game updates this one too.
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** The last game played here, or the default one; the server render always uses the default. */
export function useRecentGame(): Game {
  const id = useSyncExternalStore(subscribe, read, () => null);
  return gameById(id) ?? DEFAULT_GAME;
}
