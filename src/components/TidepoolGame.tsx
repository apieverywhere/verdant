'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Mode, Player } from '@/lib/game/types';
import { rememberGame } from '@/lib/recentGame';
import type { TidepoolPick, TidepoolView } from '@/lib/scene/TidepoolController';
import { chooseMove } from '@/lib/tidepool/ai';
import type { AiReply } from '@/lib/tidepool/ai.worker';
import { initialMatch, isAiTurn, matchReducer } from '@/lib/tidepool/match';
import { cellName, DIR_NAMES, lineOf, movesForGroup, other, WIN_PUSHES, type Move } from '@/lib/tidepool/rules';
import { TIDEPOOL_HELP } from './helpCards';
import HowToPlay from './HowToPlay';
import { DifficultyPicker, Divider, NoWebGL, Score, Scoreboard, StatusPill, TitleCard, Toolbar } from './Hud';
import TidepoolScene from './TidepoolScene';

const AI_DELAY_MS = 650;
const COLORS: Record<Player, string> = { X: '#f1ece2', O: '#ff7a6b' };
const NAME: Record<Player, string> = { X: 'Pearl', O: 'Coral' };

export default function TidepoolGame() {
  const [match, dispatch] = useReducer(matchReducer, undefined, () => initialMatch());
  const [noGL, setNoGL] = useState(false);
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
      ? game.winner === 'X' ? `You (Pearl) win! ${WIN_PUSHES} Coral marbles in the sea` : 'The computer (Coral) wins this round!'
      : `${NAME[game.winner]} wins! ${WIN_PUSHES} marbles pushed off`;
  } else if (aiTurn) status = 'Computer (Coral) is thinking…';
  else if (sel.length) status = `${NAME[game.turn]}: ${sel.length} selected · click a gold marker`;
  else status = `${ai ? 'Your turn (Pearl)' : `${NAME[game.turn]}’s turn`} · select 1–3 marbles in a line`;
  const statusColor = COLORS[game.winner ?? game.turn];

  const moveLabel = (m: Move) => {
    const where = DIR_NAMES[m.dir];
    if (m.lead < 0) return `Step ${where} (sideways)`;
    if (!m.push) return `Move ${where}`;
    const pushed = `${m.push} ${NAME[other(game.turn)]} marble${m.push > 1 ? 's' : ''}`;
    return m.off ? `Move ${where}, pushing ${pushed} — one falls into the sea` : `Move ${where}, pushing ${pushed}`;
  };

  return (
    <main className="stage lagoon">
      <TidepoolScene view={view} onPick={onPick} onUnsupported={onUnsupported} />

      <div className="hud">
        <div className="hud-top">
          <TitleCard title="Tidepool" subtitle="Push 6 of your opponent’s marbles into the sea" />
          <div className="hud-top-right">
            <Scoreboard>
              <Score
                icon={<MarbleIcon fill="#f1ece2" shine="#ffffff" />}
                value={<>{game.lost.O}<small>/{WIN_PUSHES}</small></>}
                label={ai ? 'You · Pearl' : 'Pearl'}
                sub={`Wins ${wins.X}`}
                testId="score-x"
              />
              <Divider />
              <Score
                icon={<MarbleIcon fill="#ff6f5e" shine="#ffb3a8" />}
                value={<>{game.lost.X}<small>/{WIN_PUSHES}</small></>}
                label={ai ? 'CPU · Coral' : 'Coral'}
                sub={`Wins ${wins.O}`}
                testId="score-o"
              />
            </Scoreboard>
            <HowToPlay subtitle="Tidepool · Pearl vs Coral · first to push off 6 wins" cards={TIDEPOOL_HELP} />
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
          <p className="help">Click 1–3 of your marbles in a line · Click a gold marker to move · Drag to rotate · Scroll to zoom</p>
        </div>
      </div>

      {/* Keyboard / screen-reader controls; visually hidden until focused. */}
      <div className="a11y-board a11y-list" role="group" aria-label="Marbles (keyboard)">
        <div role="group" aria-label={`${NAME[game.turn]} marbles`}>
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
          <div role="group" aria-label="Moves for the selected marbles">
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
