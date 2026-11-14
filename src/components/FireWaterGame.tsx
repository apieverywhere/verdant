'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { chooseColumn } from '@/lib/fire-water/ai';
import type { AiReply } from '@/lib/fire-water/ai.worker';
import { initialMatch, isAiTurn, matchReducer } from '@/lib/fire-water/match';
import { COLUMNS, SIZE, dropCell, stackHeight } from '@/lib/fire-water/rules';
import type { Mode } from '@/lib/game/types';
import { useT } from '@/lib/i18n';
import { rememberGame } from '@/lib/recentGame';
import type { FireWaterView } from '@/lib/scene/FireWaterController';
import SceneLoader from './SceneLoader';
import { FIRE_WATER_HELP } from './helpCards';
import HowToPlay from './HowToPlay';
import { DifficultyPicker, Divider, HudButtons, NoWebGL, Score, Scoreboard, StatusPill, TitleCard, Toolbar } from './Hud';

const AI_DELAY_MS = 650;
const COLORS = { X: '#ff7a4d', O: '#5ab0ff', D: '#c3d6e3' };

// three.js and the scene load after the page shell; the dolphin loader covers the wait.
const FireWaterScene = dynamic(() => import('./FireWaterScene'), { ssr: false });

export default function FireWaterGame() {
  const t = useT();
  const tf = t.fw;
  const NAME = tf.names;
  const [match, dispatch] = useReducer(matchReducer, undefined, () => initialMatch('ai', 'easy')); // opens against the computer, on Easy
  const [noGL, setNoGL] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const requestId = useRef(0);
  const { game, mode, difficulty, scores } = match;
  const ai = mode === 'ai';
  const aiTurn = isAiTurn(match);

  // The search runs in a worker, created on the computer's first turn (2-player games never load it). Without
  // worker support it falls back to the main thread.
  const worker = useRef<Worker | null | undefined>(undefined);
  const getWorker = useCallback(() => {
    if (worker.current === undefined) {
      try {
        worker.current = new Worker(new URL('../lib/fire-water/ai.worker.ts', import.meta.url), { type: 'module' });
      } catch {
        worker.current = null;
      }
    }
    return worker.current;
  }, []);
  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = undefined;
    },
    [],
  );

  // Computer move after at least a short "thinking" pause; the cleanup cancels it on reset / mode change.
  useEffect(() => {
    if (!aiTurn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    const play = (col: number) => {
      if (cancelled || col < 0) return;
      timer = setTimeout(() => dispatch({ type: 'play', col, source: 'ai' }), Math.max(0, AI_DELAY_MS - (performance.now() - started)));
    };
    const w = getWorker();
    if (w) {
      const id = ++requestId.current;
      const onReply = (e: MessageEvent<AiReply>) => {
        if (e.data.id === id) play(e.data.col);
      };
      w.addEventListener('message', onReply);
      w.postMessage({ id, state: game, difficulty });
      return () => {
        cancelled = true;
        clearTimeout(timer);
        w.removeEventListener('message', onReply);
      };
    }
    timer = setTimeout(() => play(chooseColumn(game, difficulty)), AI_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [aiTurn, game, difficulty, getWorker]);

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
  if (game.winner === 'D') status = tf.draw;
  else if (game.winner) status = ai ? (game.winner === 'X' ? tf.youWin : tf.computerWins) : tf.sideWins(NAME[game.winner]);
  else if (ai) status = game.turn === 'X' ? tf.yourTurn : tf.thinking;
  else status = tf.sideTurn(NAME[game.turn]);
  const statusColor = COLORS[game.winner === 'D' ? 'D' : (game.winner ?? game.turn)];

  const columnLabel = (col: number) => {
    const name = tf.column(Math.floor(col / SIZE) + 1, (col % SIZE) + 1);
    const height = stackHeight(game.board, col);
    if (!height) return tf.empty(name);
    const top = game.board[col + COLUMNS * (height - 1)]!;
    return tf.stack(name, height, NAME[top]);
  };

  return (
    <main className="stage moon">
      <FireWaterScene view={view} onPick={play} onUnsupported={onUnsupported} onReady={onReady} />
      <SceneLoader done={ready || noGL} />

      <div className="hud">
        <div className="hud-top">
          <TitleCard title="Ember & Tide" subtitle={tf.subtitle} />
          <div className="hud-top-right">
            <Scoreboard>
              <Score icon={<FireIcon />} value={scores.X} label={ai ? `${t.you} · ${NAME.X}` : NAME.X} testId="score-x" />
              <Divider />
              <Score icon={<DrawIcon />} value={scores.D} label={t.draws} testId="score-d" narrow />
              <Divider />
              <Score icon={<WaterIcon />} value={scores.O} label={ai ? `${t.cpu} · ${NAME.O}` : NAME.O} testId="score-o" />
            </Scoreboard>
            <HudButtons>
              <HowToPlay subtitle={tf.helpSubtitle} cards={FIRE_WATER_HELP} />
            </HudButtons>
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
          <p className="help">{tf.controls}</p>
        </div>
      </div>

      {/* Keyboard / screen-reader board (F4.5); visually hidden until focused. */}
      <div className="a11y-board" role="grid" aria-label={t.boardKeyboard}>
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
