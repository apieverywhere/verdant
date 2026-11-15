'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useMusic, useOnChange, useSfx } from '@/lib/audio/useAudio';
import type { Mode, Player } from '@/lib/game/types';
import { useT } from '@/lib/i18n';
import { rememberGame } from '@/lib/recentGame';
import type { TidepoolPick, TidepoolView } from '@/lib/scene/TidepoolController';
import { chooseMove } from '@/lib/tidepool/ai';
import type { AiReply } from '@/lib/tidepool/ai.worker';
import { initialMatch, isAiTurn, matchReducer } from '@/lib/tidepool/match';
import { cellPos, lineOf, movesForGroup, other, WIN_PUSHES, type Move } from '@/lib/tidepool/rules';
import { TIDEPOOL_HELP } from './helpCards';
import HowToPlay from './HowToPlay';
import { DifficultyPicker, Divider, HudButtons, NoWebGL, ResultCard, Score, Scoreboard, StatusPill, TitleCard, Toolbar, type RoundResult } from './Hud';
import SceneLoader from './SceneLoader';

const AI_DELAY_MS = 650;
const COLORS: Record<Player, string> = { X: '#f1ece2', O: '#ff7a6b' };

// three.js and the scene load after the page shell; the dolphin loader covers the wait.
const TidepoolScene = dynamic(() => import('./TidepoolScene'), { ssr: false });

export default function TidepoolGame() {
  const t = useT();
  const tp = t.tp;
  const NAME = tp.names;
  useMusic('lagoon');
  const sfx = useSfx();
  const cellName = (cell: number) => {
    const { row, hole } = cellPos(cell);
    return tp.cell(row, hole);
  };
  const [match, dispatch] = useReducer(matchReducer, undefined, () => initialMatch('ai', 'easy')); // opens against the computer, on Easy
  const [noGL, setNoGL] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const { game, mode, difficulty, wins, sel } = match;
  const requestId = useRef(0);
  const ai = mode === 'ai';
  const aiTurn = isAiTurn(match);
  const interactive = !game.winner && !aiTurn;

  // The search runs in a worker, created on the computer's first turn (2-player games never load it). Without
  // worker support it falls back to the main thread.
  const worker = useRef<Worker | null | undefined>(undefined);
  const getWorker = useCallback(() => {
    if (worker.current === undefined) {
      try {
        worker.current = new Worker(new URL('../lib/tidepool/ai.worker.ts', import.meta.url), { type: 'module' });
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
    const play = (move: Move | null) => {
      if (cancelled || !move) return;
      timer = setTimeout(() => dispatch({ type: 'move', move, source: 'ai' }), Math.max(0, AI_DELAY_MS - (performance.now() - started)));
    };
    const w = getWorker();
    if (w) {
      const id = ++requestId.current;
      const onReply = (e: MessageEvent<AiReply>) => {
        if (e.data.id === id) play(e.data.move);
      };
      w.addEventListener('message', onReply);
      w.postMessage({ id, state: game, difficulty });
      return () => {
        cancelled = true;
        clearTimeout(timer);
        w.removeEventListener('message', onReply);
      };
    }
    timer = setTimeout(() => play(chooseMove(game, difficulty)), AI_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [aiTurn, game, difficulty, getWorker]);

  // The lobby's Play buttons return to the game played last.
  useEffect(() => rememberGame('tidepool'), []);

  // Sounds: marbles roll, knock into each other, or fall into the sea; a soft tick when picking marbles up.
  useOnChange(game.last, (l) => {
    if (!l) return;
    if (l.off) {
      sfx('clack');
      sfx('splash', 260);
    } else sfx(l.move.push ? 'clack' : 'slide');
  });
  useOnChange(sel.length, (n, was) => n > was && sfx('tap'));
  useOnChange(game.winner, (w) => w && sfx(ai && w !== 'X' ? 'lose' : 'win', 350));

  const line = useMemo(() => lineOf(sel), [sel]);
  const moves = useMemo<Move[]>(() => (line && interactive ? movesForGroup(game.board, line, game.turn) : []), [line, interactive, game]);

  const onPick = useCallback(
    (hit: TidepoolPick) => {
      if (hit.kind === 'move') {
        const move = moves[hit.index];
        if (move) dispatch({ type: 'move', move, source: 'human' });
      } else if (hit.cell < 0) {
        dispatch({ type: 'clearSelection' });
      } else {
        dispatch({ type: 'select', cell: hit.cell });
      }
    },
    [moves],
  );
  const onUnsupported = useCallback(() => setNoGL(true), []);
  const setMode = useCallback((m: Mode) => dispatch({ type: 'setMode', mode: m }), []);

  const view = useMemo<TidepoolView>(
    () => ({
      board: game.board,
      ids: game.ids,
      owners: game.owners,
      turn: game.turn,
      sel,
      moves,
      last: game.last,
      moveCount: game.moveCount,
      interactive,
      gameId: match.gameId,
    }),
    [game, sel, moves, interactive, match.gameId],
  );

  let status: string;
  if (game.winner) {
    status = ai
      ? game.winner === 'X' ? tp.youWin(WIN_PUSHES) : tp.computerWins
      : tp.sideWins(NAME[game.winner], WIN_PUSHES);
  } else if (aiTurn) status = tp.thinking;
  else if (sel.length) status = tp.selected(NAME[game.turn], sel.length);
  else status = `${ai ? tp.yourTurn : tp.sideTurn(NAME[game.turn])} · ${tp.selectHint}`;
  const statusColor = COLORS[game.winner ?? game.turn];

  const result = useMemo<RoundResult | null>(() => {
    const w = game.winner;
    if (!w) return null;
    const names = { X: ai ? `${t.you} · ${NAME.X}` : NAME.X, O: ai ? `${t.cpu} · ${NAME.O}` : NAME.O };
    return {
      tone: ai ? (w === 'X' ? 'win' : 'lose') : 'win',
      title: ai ? (w === 'X' ? t.result.youWin : t.result.computerWins) : t.result.sideWins(NAME[w]),
      detail: tp.reasonWin(WIN_PUSHES),
      score: `${names.X} ${wins.X} – ${wins.O} ${names.O}`,
      round: wins.X + wins.O,
      icon: w === 'X' ? <MarbleIcon fill="#f1ece2" shine="#ffffff" /> : <MarbleIcon fill="#ff6f5e" shine="#ffb3a8" />,
    };
  }, [game.winner, ai, wins, t, tp, NAME]);

  const moveLabel = (m: Move) => {
    const where = tp.dirs[m.dir];
    if (m.lead < 0) return tp.stepSideways(where);
    if (!m.push) return tp.move(where);
    const pushed = tp.pushed(m.push, NAME[other(game.turn)]);
    return m.off ? tp.movePushOff(where, pushed) : tp.movePush(where, pushed);
  };

  return (
    <main className="stage lagoon">
      <TidepoolScene view={view} onPick={onPick} onUnsupported={onUnsupported} onReady={onReady} />
      <SceneLoader done={ready || noGL} />

      <div className="hud">
        <div className="hud-top">
          <TitleCard title="Tidepool" subtitle={tp.subtitle} />
          <div className="hud-top-right">
            <Scoreboard>
              <Score
                icon={<MarbleIcon fill="#f1ece2" shine="#ffffff" />}
                value={<>{game.lost.O}<small>/{WIN_PUSHES}</small></>}
                label={ai ? `${t.you} · ${NAME.X}` : NAME.X}
                sub={t.wins(wins.X)}
                testId="score-x"
              />
              <Divider />
              <Score
                icon={<MarbleIcon fill="#ff6f5e" shine="#ffb3a8" />}
                value={<>{game.lost.X}<small>/{WIN_PUSHES}</small></>}
                label={ai ? `${t.cpu} · ${NAME.O}` : NAME.O}
                sub={t.wins(wins.O)}
                testId="score-o"
              />
            </Scoreboard>
            <HudButtons>
              <HowToPlay subtitle={tp.helpSubtitle} cards={TIDEPOOL_HELP} />
            </HudButtons>
          </div>
        </div>

        {noGL && <NoWebGL />}
        <ResultCard result={result} gameId={match.gameId} onPlayAgain={() => dispatch({ type: 'newGame' })} />

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
          <p className="help">{tp.controls}</p>
        </div>
      </div>

      {/* Keyboard / screen-reader controls; visually hidden until focused. */}
      <div className="a11y-board a11y-list" role="group" aria-label={tp.marblesKeyboard}>
        <div role="group" aria-label={tp.marblesGroup(NAME[game.turn])}>
          {game.board.map((p, cell) =>
            p === game.turn ? (
              <button
                key={cell}
                type="button"
                data-cell={cell}
                aria-pressed={sel.includes(cell)}
                disabled={!interactive}
                onClick={() => dispatch({ type: 'select', cell })}
              >
                {`${NAME[p]} ${cellName(cell)}`}
              </button>
            ) : null,
          )}
        </div>
        {moves.length > 0 && (
          <div role="group" aria-label={tp.movesGroup}>
            {moves.map((m, i) => (
              <button key={i} type="button" data-move={i} onClick={() => dispatch({ type: 'move', move: m, source: 'human' })}>
                {moveLabel(m)}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const MarbleIcon = ({ fill, shine }: { fill: string; shine: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill={fill} />
    <circle cx="9" cy="9" r="3" fill={shine} />
  </svg>
);
