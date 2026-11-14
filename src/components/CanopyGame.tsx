'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { chooseTurn } from '@/lib/canopy/ai';
import type { AiReply } from '@/lib/canopy/ai.worker';
import { initialMatch, isAiTurn, matchReducer } from '@/lib/canopy/match';
import { climbersOf, colOf, cutTargets, growTargets, lanternCount, other, ownerOf, rowOf, stepTargets, TREETOP, WIN_LANTERNS } from '@/lib/canopy/rules';
import type { Turn } from '@/lib/canopy/search';
import type { Mode, Player } from '@/lib/game/types';
import { useT } from '@/lib/i18n';
import { rememberGame } from '@/lib/recentGame';
import type { CanopyView } from '@/lib/scene/CanopyController';
import SceneLoader from './SceneLoader';
import { CANOPY_HELP } from './helpCards';
import HowToPlay from './HowToPlay';
import { DifficultyPicker, Divider, HudButtons, NoWebGL, Score, Scoreboard, StatusPill, TitleCard, Toolbar } from './Hud';

/** Shortest "thinking" pause before the computer steps, and the pause before each later part of its turn. */
const AI_DELAY_MS = 650;
const AI_PART_DELAY_MS = 600;
const COLORS: Record<Player, string> = { X: '#ffb347', O: '#a99cff' };

// three.js and the scene load after the page shell; the dolphin loader covers the wait.
const CanopyScene = dynamic(() => import('./CanopyScene'), { ssr: false });

export default function CanopyGame() {
  const t = useT();
  const tc = t.cn;
  const NAME = tc.names;
  const STAGE_NAMES = tc.stages;
  const cellName = (cell: number) => tc.cell(rowOf(cell) + 1, colOf(cell) + 1);
  const [match, dispatch] = useReducer(matchReducer, undefined, () => initialMatch('ai', 'easy')); // opens against the computer, on Easy
  const [noGL, setNoGL] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const { game, mode, difficulty, wins } = match;
  const requestId = useRef(0);
  /** The grow and cut the computer planned together with its step. */
  const plan = useRef<Turn | null>(null);
  const ai = mode === 'ai';
  const aiTurn = isAiTurn(match);
  const interactive = !game.winner && !aiTurn;

  // The search runs in a worker, created on the computer's first turn (2-player games never load it). Without
  // worker support it falls back to the main thread.
  const worker = useRef<Worker | null | undefined>(undefined);
  const getWorker = useCallback(() => {
    if (worker.current === undefined) {
      try {
        worker.current = new Worker(new URL('../lib/canopy/ai.worker.ts', import.meta.url), { type: 'module' });
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

  // Computer turn. It thinks once, in the move phase, about the whole turn; the step, the grow and the cut (or
  // skip) are then played a moment apart, so each can be followed. The cleanup cancels it on reset / mode change.
  useEffect(() => {
    if (!aiTurn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (game.phase !== 'move') {
      timer = setTimeout(() => {
        // The plan only goes stale if this effect restarted mid-turn; then the rest of the turn is chosen afresh.
        let p = plan.current;
        const fits = p && (game.phase === 'grow' ? growTargets(game, game.active).includes(p.grow) : p.cut < 0 || cutTargets(game, game.active, game.lastGrow).includes(p.cut));
        if (!fits) p = chooseTurn(game, difficulty);
        if (!p) return;
        if (game.phase === 'grow') dispatch({ type: 'grow', cell: p.grow, source: 'ai' });
        else {
          plan.current = null;
          dispatch(p.cut >= 0 ? { type: 'cut', cell: p.cut, source: 'ai' } : { type: 'skipCut', source: 'ai' });
        }
      }, AI_PART_DELAY_MS);
      return () => clearTimeout(timer);
    }
    const started = performance.now();
    const play = (turn: Turn | null) => {
      if (cancelled || !turn) return;
      timer = setTimeout(() => {
        plan.current = turn;
        dispatch({ type: 'step', climber: turn.climber, to: turn.to, source: 'ai' });
      }, Math.max(0, AI_DELAY_MS - (performance.now() - started)));
    };
    const w = getWorker();
    if (w) {
      const id = ++requestId.current;
      const onReply = (e: MessageEvent<AiReply>) => {
        if (e.data.id === id) play(e.data.turn);
      };
      w.addEventListener('message', onReply);
      w.postMessage({ id, state: game, difficulty });
      return () => {
        cancelled = true;
        clearTimeout(timer);
        w.removeEventListener('message', onReply);
      };
    }
    timer = setTimeout(() => play(chooseTurn(game, difficulty)), AI_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [aiTurn, game, difficulty, getWorker]);

  // The lobby's Play buttons return to the game played last.
  useEffect(() => rememberGame('canopy'), []);

  // The climber in hand: the one picked up before stepping, or the one that just stepped and now grows and cuts.
  const sel = game.phase === 'move' ? match.sel : game.active;
  const targets = useMemo<number[]>(() => {
    if (!interactive || sel < 0) return [];
    if (game.phase === 'move') return stepTargets(game, sel);
    return game.phase === 'grow' ? growTargets(game, sel) : cutTargets(game, sel, game.lastGrow);
  }, [interactive, sel, game]);

  const act = useCallback(
    (cell: number) => {
      if (game.phase === 'grow') dispatch({ type: 'grow', cell, source: 'human' });
      else if (game.phase === 'cut') dispatch({ type: 'cut', cell, source: 'human' });
      else dispatch({ type: 'step', climber: sel, to: cell, source: 'human' });
    },
    [game.phase, sel],
  );
  const onPick = useCallback(
    (cell: number) => {
      if (targets.includes(cell)) return act(cell);
      if (game.phase !== 'move') return; // mid-turn: only the markers respond
      const climber = game.climbers.indexOf(cell);
      if (climber >= 0) dispatch({ type: 'select', climber });
      else dispatch({ type: 'clearSelection' });
    },
    [targets, act, game.phase, game.climbers],
  );
  const skipCut = useCallback(() => dispatch({ type: 'skipCut', source: 'human' }), []);
  const onUnsupported = useCallback(() => setNoGL(true), []);
  const setMode = useCallback((m: Mode) => dispatch({ type: 'setMode', mode: m }), []);

  const view = useMemo<CanopyView>(
    () => ({
      level: game.level,
      lantern: game.lantern,
      climbers: game.climbers,
      turn: game.turn,
      phase: game.phase,
      sel,
      targets,
      last: game.last,
      lastStep: game.lastStep,
      lastGrow: game.lastGrow,
      lastCut: game.lastCut,
      actionCount: game.actionCount,
      interactive,
      gameId: match.gameId,
    }),
    [game, sel, targets, interactive, match.gameId],
  );

  let status: string;
  if (game.winner) {
    const who = ai ? (game.winner === 'X' ? tc.youWin : tc.computerWins) : tc.sideWins(NAME[game.winner]);
    status = `${who} ${game.reason === 'stuck' ? tc.stuck(NAME[other(game.winner)]) : tc.twoLit}`;
  } else if (aiTurn) status = tc.thinking;
  else if (game.phase === 'grow') status = tc.grow(NAME[game.turn]);
  else if (game.phase === 'cut') status = tc.cut(NAME[game.turn]);
  else if (sel >= 0) status = tc.moveTo(NAME[game.turn]);
  else status = `${ai ? tc.yourTurn : tc.sideTurn(NAME[game.turn])} · ${tc.pickClimber}`;
  const statusColor = COLORS[game.winner ?? game.turn];

  const targetLabel = (cell: number) => {
    const stage = game.level[cell];
    if (game.phase === 'grow') return tc.growLabel(cellName(cell), STAGE_NAMES[stage], STAGE_NAMES[stage + 1]);
    if (game.phase === 'cut') {
      const lantern = stage === TREETOP && game.lantern[cell] ? tc.putOut(NAME[game.lantern[cell]!]) : '';
      return tc.cutLabel(cellName(cell), STAGE_NAMES[stage], STAGE_NAMES[stage - 1], lantern);
    }
    const lantern = stage === TREETOP && game.lantern[cell] !== game.turn ? (game.lantern[cell] ? tc.takeLantern : tc.lightLantern) : '';
    return tc.stepLabel(cellName(cell), STAGE_NAMES[stage], lantern);
  };

  return (
    <main className="stage forest">
      <CanopyScene view={view} onPick={onPick} onUnsupported={onUnsupported} onReady={onReady} />
      <SceneLoader done={ready || noGL} />

      <div className="hud">
        <div className="hud-top">
          <TitleCard title="Canopy" subtitle={tc.subtitle} />
          <div className="hud-top-right">
            <Scoreboard>
              <Score
                icon={<ClimberIcon body="#ffb347" head="#ffe0a8" />}
                value={<>{lanternCount(game, 'X')}<small>/{WIN_LANTERNS}</small></>}
                label={ai ? `${t.you} · ${NAME.X}` : NAME.X}
                sub={t.wins(wins.X)}
                testId="score-x"
              />
              <Divider />
              <Score
                icon={<ClimberIcon body="#8a7cf5" head="#d2cbff" />}
                value={<>{lanternCount(game, 'O')}<small>/{WIN_LANTERNS}</small></>}
                label={ai ? `${t.cpu} · ${NAME.O}` : NAME.O}
                sub={t.wins(wins.O)}
                testId="score-o"
              />
            </Scoreboard>
            <HudButtons>
              <HowToPlay subtitle={tc.helpSubtitle} cards={CANOPY_HELP} />
            </HudButtons>
          </div>
        </div>

        {noGL && <NoWebGL />}

        <div className="hud-bottom">
          <StatusPill color={statusColor} status={status} />
          {interactive && game.phase === 'cut' && (
            <button type="button" className="cbtn skip-cut" onClick={skipCut}>
              {tc.skipCut}
            </button>
          )}
          <Toolbar
            mode={mode}
            onMode={setMode}
            onNewGame={() => dispatch({ type: 'newGame' })}
            onResetScores={() => dispatch({ type: 'resetScores' })}
          >
            {ai && <DifficultyPicker value={difficulty} onChange={(d) => dispatch({ type: 'setDifficulty', difficulty: d })} />}
          </Toolbar>
          <p className="help">{tc.controls}</p>
        </div>
      </div>

      {/* Keyboard / screen-reader controls; visually hidden until focused. */}
      <div className="a11y-board a11y-list" role="group" aria-label={tc.climbersKeyboard}>
        <div role="group" aria-label={tc.climbersGroup(NAME[game.turn])}>
          {climbersOf(game.turn).map((k) => (
            <button
              key={k}
              type="button"
              data-climber={k}
              aria-pressed={sel === k}
              disabled={!interactive || game.phase !== 'move'}
              onClick={() => dispatch({ type: 'select', climber: k })}
            >
              {tc.climberOn(NAME[ownerOf(k)], cellName(game.climbers[k]), STAGE_NAMES[game.level[game.climbers[k]]])}
            </button>
          ))}
        </div>
        {targets.length > 0 && (
          <div role="group" aria-label={game.phase === 'grow' ? tc.tilesGrow : game.phase === 'cut' ? tc.tilesCut : tc.tilesStep}>
            {targets.map((cell) => (
              <button key={cell} type="button" data-target={cell} onClick={() => act(cell)}>
                {targetLabel(cell)}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const ClimberIcon = ({ body, head }: { body: string; head: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7" y="11" width="10" height="11" rx="3.5" fill={body} />
    <circle cx="12" cy="7.5" r="4.5" fill={head} />
  </svg>
);
