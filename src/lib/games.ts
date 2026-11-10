/** Every live game, in lobby order. The first one is the default “Play” target until a game has been played. */
export const GAMES = [
  {
    id: 'lantern-line',
    name: 'Lantern Line',
    href: '/lantern-line',
    /** Search-result title after the name: what the game is, in the words people search for. */
    kind: 'Vanishing Tic-Tac-Toe in 3D',
    scene: 'Sunset Valley',
    description:
      'Vanishing tic-tac-toe in 3D: each side keeps only 3 pieces, so your oldest one fades as you place a new one. Free in your browser, with a friend or against the computer.',
    genre: ['Board game', 'Strategy', 'Tic-tac-toe'],
    artBg: '#2f5f80',
  },
  {
    id: 'ember-and-tide',
    name: 'Ember & Tide',
    href: '/ember-and-tide',
    kind: '3D Four-in-a-Row Stacking Game',
    scene: 'Moonlit Ice Lake',
    description:
      'Fire vs Water on a 5×5 board: pieces drop in and stack up to 5 high. Connect 4 in any direction, including straight up, to win. Free in your browser, 2 players or vs the computer.',
    genre: ['Board game', 'Strategy', 'Four in a row'],
    artBg: '#0f2550',
  },
  {
    id: 'tidepool',
    name: 'Tidepool',
    href: '/tidepool',
    kind: 'Hex Marble-Pushing Strategy Game',
    scene: 'Lagoon at Dusk',
    description:
      "Pearl vs Coral on a hexagonal board in a lagoon. Push lines of marbles and knock 6 of your opponent's into the sea. Free in your browser, 2 players or vs the computer.",
    genre: ['Board game', 'Strategy', 'Abstract strategy'],
    artBg: '#2f6f8f',
  },
] as const;

export type Game = (typeof GAMES)[number];
export type GameId = Game['id'];

export const DEFAULT_GAME: Game = GAMES[0];

export const gameById = (id: string | null): Game | undefined => GAMES.find((g) => g.id === id);
