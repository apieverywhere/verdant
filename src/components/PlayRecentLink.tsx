'use client';

import Link from 'next/link';
import { useRecentGame } from '@/lib/recentGame';

/** Lobby “Play” button that goes to the game played last, or the default game for a first visit. */
export default function PlayRecentLink({ className, named }: { className: string; named?: boolean }) {
  const game = useRecentGame();
  return (
    <Link className={className} href={game.href} data-testid={named ? 'play-recent-hero' : 'play-recent-nav'}>
      {named ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 4.5v15l12-7.5z" />
          </svg>
          Play {game.name}
        </>
      ) : (
        'Play now'
      )}
    </Link>
  );
}
