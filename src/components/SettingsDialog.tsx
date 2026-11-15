'use client';

/**
 * Gear button plus the settings dialog: interface language, and music / sound-effect volumes. A native modal
 * <dialog> gives the focus trap, Escape to close and focus return, as in How to play. Every change is saved
 * at once, so there is no Cancel.
 */
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { useSfx } from '@/lib/audio/useAudio';
import { playSfx } from '@/lib/audio/sfx';
import { LANG_NAMES, useT } from '@/lib/i18n';
import { LANGS, updateSettings, useSettings } from '@/lib/settings';

export default function SettingsDialog({ className = 'cbtn settings-btn' }: { className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  const settings = useSettings();
  const titleId = useId();
  const sfx = useSfx();
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" className={className} aria-label={t.settings} title={t.settings} onClick={() => { sfx('tap'); ref.current?.showModal(); }}>
        <GearIcon />
      </button>
      <dialog
        ref={ref}
        className="settings-dialog"
        aria-labelledby={titleId}
        // A click that lands on the <dialog> itself, not its content, is a click on the backdrop.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="help-body">
          <div className="help-head">
            <h2 id={titleId}>{t.settings}</h2>
            <button type="button" className="cbtn help-close" aria-label={t.close} onClick={close}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <section className="settings-group">
            <h3>{t.language}</h3>
            <div role="group" aria-label={t.language} className="segmented settings-langs">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className="cbtn seg"
                  lang={l}
                  aria-pressed={settings.lang === l}
                  onClick={() => updateSettings({ lang: l })}
                >
                  {LANG_NAMES[l]}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-group">
            <h3>{t.sound}</h3>
            <VolumeSlider label={t.music} off={t.muted} value={settings.music} onChange={(music) => updateSettings({ music })} />
            {/* Letting go of the effects slider plays a sample, so the level can be judged. */}
            <VolumeSlider label={t.sfx} off={t.muted} value={settings.sfx} onChange={(sfx) => updateSettings({ sfx })} onCommit={() => playSfx('place')} />
            <p className="settings-note">{t.audioHint}</p>
          </section>

          <div className="settings-foot">
            <button type="button" className="cbtn help-next" onClick={close}>{t.done}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function VolumeSlider({ label, off, value, onChange, onCommit }: { label: string; off: string; value: number; onChange: (v: number) => void; onCommit?: () => void }) {
  const id = useId();
  const shown = value === 0 ? off : `${value}%`;
  return (
    <div className="settings-volume">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        aria-valuetext={shown}
        style={{ '--fill': `${value}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
      <output htmlFor={id}>{shown}</output>
    </div>
  );
}

/** Keeps <html lang> in step with the chosen language, for screen readers and hyphenation. */
export function LangSync() {
  const { lang } = useSettings();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
