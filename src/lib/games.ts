/** Every live game, in lobby order. The first one is the default “Play” target until a game has been played. */
export const GAMES = [
  { id: 'lantern-line', name: 'Lantern Line', href: '/lantern-line' },
  { id: 'ember-and-tide', name: 'Ember & Tide', href: '/ember-and-tide' },
  { id: 'tidepool', name: 'Tidepool', href: '/tidepool' },
] as const;

export type Game = (typeof GAMES)[number];
export type GameId = Game['id'];

export const DEFAULT_GAME: Game = GAMES[0];

export const gameById = (id: string | null): Game | undefined => GAMES.find((g) => g.id === id);
