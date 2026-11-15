'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useMusic, useOnChange, useSfx } from '@/lib/audio/useAudio';
import { chooseMove } from '@/lib/game/ai';
import { initialMatch, isAiTurn, matchReducer } from '@/lib/game/match';
import { vanishingCell } from '@/lib/game/rules';
import type { Mode } from '@/lib/game/types';
import { useT } from '@/lib/i18n';
import { rememberGame } from '@/lib/recentGame';
import type { SceneView } from '@/lib/scene/SceneController';
import SceneLoader from './SceneLoader';
import { TIC_TAC_TOE_HELP } from './helpCards';
import HowToPlay from './HowToPlay';
import { DifficultyPicker, Divider, HudButtons, NoWebGL, ResultCard, Score, Scoreboard, StatusPill, TitleCard, Toolbar, type RoundResult } from './Hud';

const AI_DELAY_MS = 600;
const COLORS = { X: '#ff7a6b', O: '#4fd8cc', D: '#c3d6e3' };

// three.js and the scene load after the page shell; the dolphin loader covers the wait.
const BoardScene = dynamic(() => import('./BoardScene'), { ssr: false });

export default function Game() {
  const t = useT();
  const tt = t.ttt;
  useMusic('sunset');
  const sfx = useSfx();
  const cellName = (i: number) => tt.cell(Math.floor(i / 3) + 1, (i % 3) + 1);
  const [match, dispatch] = useReducer(matchReducer, undefined, () => initialMatch('ai', 'easy')); // opens against the computer, on Easy
  const [noGL, setNoGL] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const { game, mode, difficulty, scores } = match;
  const ai = mode === 'ai';
  const aiTurn = isAiTurn(match);
  // Only hint the vanishing piece against the computer; in 2-player mode each player must remember it.
  const vanishing = ai ? vanishingCell(game) : null;

  // Computer move after a short "thinking" pause; the cleanup cancels it on reset / mode change.
  useEffect(() => {
    if (!aiTurn) return;
    const timer = setTimeout(() => {
      const cell = chooseMove(game, difficulty);
      if (cell >= 0) dispatch({ type: 'play', cell, source: 'ai' });
    }, AI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [aiTurn, game, difficulty]);

  const play = useCallback((cell: number) => dispatch({ type: 'play', cell, source: 'human' }), []);
  const onUnsupported = useCallback(() => setNoGL(true), []);
  const setMode = useCallback((m: Mode) => dispatch({ type: 'setMode', mode: m }), []);

  // The lobby's Play buttons return to the game played last.
  useEffect(() => rememberGame('lantern-line'), []);

  // Sounds follow the state: a piece set down (and the oldest fading), then the round's outcome.
  useOnChange(game.moveCount, (n, was) => {
    if (n <= was) return;
    sfx('place');
    if (game.lastRemoved) sfx('vanish', 120);
  });
  useOnChange(game.winner, (w) => {
    if (!w) return;
    if (w === 'D') sfx('draw', 300);
    else sfx(ai && w !== 'X' ? 'lose' : 'win', 350);
  });

  const view = useMemo<SceneView>(
    () => ({
      board: game.board,
      turn: game.turn,
      winner: game.winner,
      line: game.line,
      vanishing,
      interactive: !game.winner && !aiTurn,
      gameId: match.gameId,
    }),
    [game, vanishing, aiTurn, match.gameId],
  );

  let status: string;
  if (game.winner === 'D') status = tt.draw;
  else if (game.winner) status = ai ? (game.winner === 'X' ? tt.youWin : tt.computerWins) : tt.playerWins(game.winner);
  else if (ai) status = game.turn === 'X' ? tt.yourTurn : tt.thinking;
  else status = tt.playerTurn(game.turn);
  const statusColor = COLORS[game.winner === 'D' ? 'D' : (game.winner ?? game.turn)];
  const hint =
    vanishing !== null
      ? tt.vanishHint(game.turn, cellName(vanishing))
      : null;

  const result = useMemo<RoundResult | null>(() => {
    const w = game.winner;
    if (!w) return null;
    const names = { X: ai ? t.you : tt.player('X'), O: ai ? t.computer : tt.player('O') };
    const base = { score: `${names.X} ${scores.X} – ${scores.O} ${names.O}`, round: scores.X + scores.O + scores.D };
    if (w === 'D') return { ...base, tone: 'draw', title: t.result.draw, detail: tt.reasonDraw };
    return {
      ...base,
      tone: ai ? (w === 'X' ? 'win' : 'lose') : 'win',
      title: ai ? (w === 'X' ? t.result.youWin : t.result.computerWins) : t.result.sideWins(names[w]),
      detail: tt.reasonWin,
      icon: w === 'X' ? <XIcon /> : <OIcon />,
    };
  }, [game.winner, ai, scores, t, tt]);

  const cellLabel = (i: number) => {
    const c = game.board[i];
    const what = c ? `${c}${i === vanishing ? tt.aboutToVanish : ''}` : tt.empty;
    return tt.square(cellName(i), what);
  };

  return (
    <main className="stage">
      <BoardScene view={view} onPick={play} onUnsupported={onUnsupported} onReady={onReady} />
      <SceneLoader done={ready || noGL} />

      <div className="hud">
        <div className="hud-top">
          <TitleCard title="Lantern Line" subtitle={tt.subtitle} />
          <div className="hud-top-right">
            <Scoreboard>
              <Score icon={<XIcon />} value={scores.X} label={ai ? t.you : tt.player('X')} testId="score-x" />
              <Divider />
              <Score icon={<DrawIcon />} value={scores.D} label={t.draws} testId="score-d" narrow />
              <Divider />
              <Score icon={<OIcon />} value={scores.O} label={ai ? t.computer : tt.player('O')} testId="score-o" />
            </Scoreboard>
            <HudButtons>
              <HowToPlay subtitle={tt.helpSubtitle} cards={TIC_TAC_TOE_HELP} />
            </HudButtons>
          </div>
        </div>

        {noGL && <NoWebGL />}
        <ResultCard result={result} gameId={match.gameId} onPlayAgain={() => dispatch({ type: 'newGame' })} />

        <div className="hud-bottom">
          <StatusPill color={statusColor} status={status} hint={hint} />
          <Toolbar
            mode={mode}
            onMode={setMode}
            onNewGame={() => dispatch({ type: 'newGame' })}
            onResetScores={() => dispatch({ type: 'resetScores' })}
          >
            {ai && <DifficultyPicker value={difficulty} onChange={(d) => dispatch({ type: 'setDifficulty', difficulty: d })} />}
          </Toolbar>
          <p className="help">{tt.controls}</p>
        </div>
      </div>

      {/* Keyboard / screen-reader board (R7.2); visually hidden until focused. */}
      <div className="a11y-board" role="grid" aria-label={t.boardKeyboard}>
        {[0, 1, 2].map((r) => (
          <div role="row" key={r}>
            {[0, 1, 2].map((c) => {
              const i = r * 3 + c;
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  data-cell={i}
                  aria-label={cellLabel(i)}
                  disabled={!!game.board[i] || !!game.winner || aiTurn}
                  onClick={() => play(i)}
                >
                  {game.board[i] ?? '·'}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}

const XIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.X} strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);
const DrawIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.D} strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M5 9h14M5 15h14" />
  </svg>
);
const OIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.O} strokeWidth="3.2" aria-hidden="true">
    <circle cx="12" cy="12" r="7.5" />
  </svg>
);
