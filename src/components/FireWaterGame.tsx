'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { chooseColumn } from '@/lib/fire-water/ai';
import { initialMatch, isAiTurn, matchReducer } from '@/lib/fire-water/match';
import { COLUMNS, SIZE, dropCell, stackHeight } from '@/lib/fire-water/rules';
import type { Mode, Player } from '@/lib/game/types';
import { rememberGame } from '@/lib/recentGame';
import type { FireWaterView } from '@/lib/scene/FireWaterController';
import FireWaterScene from './FireWaterScene';
import { FIRE_WATER_HELP } from './helpCards';
import HowToPlay from './HowToPlay';
import { DifficultyPicker, Divider, NoWebGL, Score, Scoreboard, StatusPill, TitleCard, Toolbar } from './Hud';

const AI_DELAY_MS = 650;
const COLORS = { X: '#ff7a4d', O: '#5ab0ff', D: '#c3d6e3' };
const NAME: Record<Player, string> = { X: 'Fire', O: 'Water' };

export default function FireWaterGame() {
  const [match, dispatch] = useReducer(matchReducer, undefined, () => initialMatch());
  const [noGL, setNoGL] = useState(false);
  const { game, mode, difficulty, scores } = match;
  const ai = mode === 'ai';
  const aiTurn = isAiTurn(match);

  // Computer move after a short "thinking" pause; the cleanup cancels it on reset / mode change.
  useEffect(() => {
    if (!aiTurn) return;
    const timer = setTimeout(() => {
      const col = chooseColumn(game, difficulty);
      if (col >= 0) dispatch({ type: 'play', col, source: 'ai' });
    }, AI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [aiTurn, game, difficulty]);

  const play = useCallback((col: number) => dispatch({ type: 'play', col, source: 'human' }), []);
  const onUnsupported = useCallback(() => setNoGL(true), []);
  const setMode = useCallback((m: Mode) => dispatch({ type: 'setMode', mode: m }), []);

  // The lobby's Play buttons return to the game played last.
  useEffect(() => rememberGame('ember-and-tide'), []);

  const view = useMemo<FireWaterView>(
    () => ({
      board: game.board,
      turn: game.turn,
      winner: game.winner,
      line: game.line,
      interactive: !game.winner && !aiTurn,
      gameId: match.gameId,
    }),
    [game, aiTurn, match.gameId],
  );

  let status: string;
  if (game.winner === 'D') status = 'It’s a draw! Press “New game” to play again';
  else if (game.winner) status = ai ? (game.winner === 'X' ? 'You (Fire) win!' : 'The computer (Water) wins this round!') : `${NAME[game.winner]} wins!`;
  else if (ai) status = game.turn === 'X' ? 'Your turn (Fire)' : 'Computer (Water) is thinking…';
  else status = `${NAME[game.turn]}’s turn`;
  const statusColor = COLORS[game.winner === 'D' ? 'D' : (game.winner ?? game.turn)];

  const columnLabel = (col: number) => {
    const name = `Row ${Math.floor(col / SIZE) + 1}, column ${(col % SIZE) + 1}`;
    const height = stackHeight(game.board, col);
    if (!height) return `${name}: empty`;
    const top = game.board[col + COLUMNS * (height - 1)]!;
    return `${name}: stack of ${height}, ${NAME[top]} on top`;
  };

  return (
    <main className="stage moon">
      <FireWaterScene view={view} onPick={play} onUnsupported={onUnsupported} />

      <div className="hud">
        <div className="hud-top">
          <TitleCard title="Ember & Tide" subtitle="Pieces stack from the bottom up · 4 in a row wins" />
          <div className="hud-top-right">
            <Scoreboard>
              <Score icon={<FireIcon />} value={scores.X} label={ai ? 'You · Fire' : 'Fire'} testId="score-x" />
              <Divider />
              <Score icon={<DrawIcon />} value={scores.D} label="Draws" testId="score-d" narrow />
              <Divider />
              <Score icon={<WaterIcon />} value={scores.O} label={ai ? 'CPU · Water' : 'Water'} testId="score-o" />
            </Scoreboard>
            <HowToPlay subtitle="Ember & Tide · drop pieces, stack them, connect 4" cards={FIRE_WATER_HELP} />
          </div>
        </div>

        {noGL && <NoWebGL />}

        <div className="hud-bottom">
          <StatusPill color={statusColor} status={status} />
          <Toolbar
            mode={mode}
            onMode={setMode}
            onNewGame={() => dispatch({ type: 'newGame' })}
            onResetScores={() => dispatch({ type: 'resetScores' })}
          >
            {ai && <DifficultyPicker value={difficulty} onChange={(d) => dispatch({ type: 'setDifficulty', difficulty: d })} />}
          </Toolbar>
          <p className="help">Click a square to drop a piece · Up to 5 pieces per stack · Drag to rotate · Scroll to zoom</p>
        </div>
      </div>

      {/* Keyboard / screen-reader board (F4.5); visually hidden until focused. */}
      <div className="a11y-board" role="grid" aria-label="Board (keyboard)">
        {Array.from({ length: SIZE }, (_, r) => (
          <div role="row" key={r}>
            {Array.from({ length: SIZE }, (_, c) => {
              const col = r * SIZE + c;
              return (
                <button
                  key={col}
                  type="button"
                  role="gridcell"
                  data-col={col}
                  aria-label={columnLabel(col)}
                  disabled={dropCell(game.board, col) < 0 || !!game.winner || aiTurn}
                  onClick={() => play(col)}
                >
                  {stackHeight(game.board, col)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}

const FireIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={COLORS.X} aria-hidden="true">
    <path d="M12 2.5c.9 3.3 4.8 5.4 4.8 10.4a4.8 4.8 0 0 1-9.6 0c0-2.4 1.2-3.9 2.5-4.9.1 1.7.9 2.8 1.9 3.2.2-3.4-.6-5.9.4-8.7z" />
  </svg>
);
const DrawIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.D} strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M5 9h14M5 15h14" />
  </svg>
);
const WaterIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={COLORS.O} aria-hidden="true">
    <path d="M12 3c3.1 4.1 6.2 7.4 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 10.4 8.9 7.1 12 3z" />
  </svg>
);
