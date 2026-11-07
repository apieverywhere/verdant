import { describe, expect, test } from 'bun:test';
import { initialMatch, isAiTurn, matchReducer, type MatchAction, type MatchState } from '../src/lib/game/match';

const run = (m: MatchState, actions: MatchAction[]) => actions.reduce(matchReducer, m);
const human = (...cells: number[]): MatchAction[] => cells.map((cell) => ({ type: 'play', cell, source: 'human' }));

describe('R1.2 / R4 — match flow', () => {
  test('a win updates the score of the winner', () => {
    const m = run(initialMatch(), human(0, 3, 1, 4, 2));
    expect(m.game.winner).toBe('X');
    expect(m.scores).toEqual({ X: 1, O: 0, D: 0 });
  });

  test('new game: the loser starts, scores are kept and a new board id is issued', () => {
    const won = run(initialMatch(), human(0, 3, 1, 4, 2));
    const next = matchReducer(won, { type: 'newGame' });
    expect(next.game.turn).toBe('O');
    expect(next.scores.X).toBe(1);
    expect(next.gameId).toBe(won.gameId + 1);
  });

  test('new game: the loser starts even if they also started the lost round', () => {
    const oWins = run(initialMatch(), human(0, 3, 1, 4, 8, 5));
    expect(oWins.game.winner).toBe('O');
    expect(matchReducer(oWins, { type: 'newGame' }).game.turn).toBe('X');
  });

  test('new game after a draw or an unfinished round alternates the starter', () => {
    const unfinished = run(initialMatch(), human(4));
    expect(matchReducer(unfinished, { type: 'newGame' }).game.turn).toBe('O');
    const drawn: MatchState = { ...initialMatch(), starter: 'O', game: { ...initialMatch().game, winner: 'D' } };
    expect(matchReducer(drawn, { type: 'newGame' }).game.turn).toBe('X');
  });

  test('reset scores clears scores and gives X the first move', () => {
    const m = run(initialMatch(), [...human(0, 3, 1, 4, 2), { type: 'newGame' }, { type: 'resetScores' }]);
    expect(m.scores).toEqual({ X: 0, O: 0, D: 0 });
    expect(m.game.turn).toBe('X');
  });

  test('switching mode resets board and scores (R4.2)', () => {
    const won = run(initialMatch(), human(0, 3, 1, 4, 2));
    const ai = matchReducer(won, { type: 'setMode', mode: 'ai' });
    expect(ai.mode).toBe('ai');
    expect(ai.scores).toEqual({ X: 0, O: 0, D: 0 });
    expect(ai.game.board.every((c) => c === null)).toBe(true);
    expect(matchReducer(ai, { type: 'setMode', mode: 'ai' })).toBe(ai);
  });

  test('changing difficulty starts a new game (R5.2)', () => {
    const m = run(initialMatch('ai', 'hard'), [...human(4), { type: 'setDifficulty', difficulty: 'easy' }]);
    expect(m.difficulty).toBe('easy');
    expect(m.game.board.every((c) => c === null)).toBe(true);
  });

  test('a draw is scored', () => {
    const cycle = [6, 8, 0, 2, 1, 3, 5, 7];
    const m = run(initialMatch(), human(0, 2, 1, 3, 5, 7, ...cycle, ...cycle));
    expect(m.game.winner).toBe('D');
    expect(m.scores.D).toBe(1);
  });
});

describe('R4.3 / R4.4 — turn ownership vs the computer', () => {
  test('the human cannot move for the computer, and the computer cannot move for the human', () => {
    const m = run(initialMatch('ai'), human(4));
    expect(isAiTurn(m)).toBe(true);
    expect(matchReducer(m, { type: 'play', cell: 0, source: 'human' })).toBe(m);
    const after = matchReducer(m, { type: 'play', cell: 0, source: 'ai' });
    expect(after.game.board[0]).toBe('O');
    expect(matchReducer(after, { type: 'play', cell: 1, source: 'ai' })).toBe(after);
  });

  test('in pvp the ai source is ignored', () => {
    const m = initialMatch('pvp');
    expect(matchReducer(m, { type: 'play', cell: 0, source: 'ai' })).toBe(m);
  });
});
