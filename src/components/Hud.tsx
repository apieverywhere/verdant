'use client';

/** HUD pieces shared by every game page; colours come from CSS variables so each scene can theme them. */
import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import type { Difficulty, Mode } from '@/lib/game/types';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Dễ' },
  { id: 'medium', label: 'Trung bình' },
  { id: 'hard', label: 'Khó' },
];

/** On phones the card shrinks to a round back-arrow link to the lobby; the title stays for screen readers. */
export function TitleCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel title-card">
      <Link className="title-back" href="/" aria-label="Back to Verdant">
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
  return <div className="panel scoreboard" aria-label="Score">{children}</div>;
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
  return (
    <div className="panel nogl">
      WebGL isn’t available in this browser, so the 3D scene can’t be drawn. Try a recent version of Chrome, Edge or
      Firefox — you can still play with the keyboard (Tab key).
    </div>
  );
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
  return (
    <div role="group" aria-label="Difficulty" className="segmented">
      {DIFFICULTIES.map((d) => (
        <button key={d.id} type="button" className="cbtn seg" aria-pressed={value === d.id} onClick={() => onChange(d.id)}>
          {d.label}
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

/** On phones the toolbar collapses behind a bottom “Settings” tab; on wider screens it is always shown. */
export function Toolbar({ mode, onMode, onNewGame, onResetScores, children }: ToolbarProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="toolbar-wrap" data-open={open || undefined}>
      <div id={panelId} className="panel toolbar">
        <div role="group" aria-label="Game mode" className="segmented">
          <button type="button" className="cbtn seg" aria-pressed={mode === 'pvp'} onClick={() => onMode('pvp')}>
            2 players
          </button>
          <button type="button" className="cbtn seg" aria-pressed={mode === 'ai'} onClick={() => onMode('ai')}>
            vs Computer
          </button>
        </div>
        {children}
        <button type="button" className="cbtn primary" onClick={() => { onNewGame(); setOpen(false); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </svg>
          New game
        </button>
        <button type="button" className="cbtn ghost" onClick={onResetScores}>
          Reset score
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
        Settings
      </button>
    </div>
  );
}
