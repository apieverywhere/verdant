'use client';

/** HUD pieces shared by every game page; colours come from CSS variables so each scene can theme them. */
import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import type { Difficulty, Mode } from '@/lib/game/types';
import { useT } from '@/lib/i18n';
import SettingsDialog from './SettingsDialog';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** On phones the card shrinks to a round back-arrow link to the lobby; the title stays for screen readers. */
export function TitleCard({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useT();
  return (
    <div className="panel title-card">
      <Link className="title-back" href="/" aria-label={t.backToVerdant}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      </Link>
      <div className="title-body">
        <Link className="back-link" href="/">← Verdant</Link>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

export function Scoreboard({ children }: { children: ReactNode }) {
  return <div className="panel scoreboard" aria-label={useT().score}>{children}</div>;
}

/** The top-right buttons every game shares: How to play is passed in, Settings is the same everywhere. */
export function HudButtons({ children }: { children: ReactNode }) {
  return (
    <div className="hud-buttons">
      {children}
      <SettingsDialog className="cbtn hud-settings settings-btn" />
    </div>
  );
}

export function Divider() {
  return <div className="divider" />;
}

interface ScoreProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  testId: string;
  narrow?: boolean;
  /** Small extra line under the label (e.g. rounds won). */
  sub?: string;
}

export function Score({ icon, value, label, testId, narrow, sub }: ScoreProps) {
  return (
    <div className={`score${narrow ? ' narrow' : ''}`}>
      {icon}
      <span className="score-value" data-testid={testId}>{value}</span>
      <span className="score-label">{label}</span>
      {sub && <span className="score-sub">{sub}</span>}
    </div>
  );
}

export function NoWebGL() {
  return <div className="panel nogl">{useT().noWebGL}</div>;
}

export function StatusPill({ color, status, hint }: { color: string; status: string; hint?: string | null }) {
  return (
    <div className="status" role="status" aria-live="polite" data-testid="status">
      <span className="dot" style={{ background: color }} />
      <span className="status-text">
        <span>{status}</span>
        {hint && <span className="status-hint">{hint}</span>}
      </span>
    </div>
  );
}

export function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (difficulty: Difficulty) => void }) {
  const t = useT();
  return (
    <div role="group" aria-label={t.difficulty} className="segmented">
      {DIFFICULTIES.map((d) => (
        <button key={d} type="button" className="cbtn seg" aria-pressed={value === d} onClick={() => onChange(d)}>
          {t[d]}
        </button>
      ))}
    </div>
  );
}

interface ToolbarProps {
  mode: Mode;
  onMode: (mode: Mode) => void;
  onNewGame: () => void;
  onResetScores: () => void;
  /** Extra controls placed after the mode selector. */
  children?: ReactNode;
}

/** On phones the toolbar collapses behind a bottom “Options” tab; on wider screens it is always shown. */
export function Toolbar({ mode, onMode, onNewGame, onResetScores, children }: ToolbarProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="toolbar-wrap" data-open={open || undefined}>
      <div id={panelId} className="panel toolbar">
        <div role="group" aria-label={t.gameMode} className="segmented">
          <button type="button" className="cbtn seg" aria-pressed={mode === 'pvp'} onClick={() => onMode('pvp')}>
            {t.twoPlayers}
          </button>
          <button type="button" className="cbtn seg" aria-pressed={mode === 'ai'} onClick={() => onMode('ai')}>
            {t.vsComputer}
          </button>
        </div>
        {children}
        <button type="button" className="cbtn primary" onClick={() => { onNewGame(); setOpen(false); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </svg>
          {t.newGame}
        </button>
        <button type="button" className="cbtn ghost" onClick={onResetScores}>
          {t.resetScore}
        </button>
      </div>
      <button
        type="button"
        className="cbtn toolbar-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={open ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'} />
        </svg>
        {t.options}
      </button>
    </div>
  );
}
