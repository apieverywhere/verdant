'use client';

import { useRef, useState, type ReactNode } from 'react';

export interface HelpCard {
  title: string;
  text: string;
  /** Illustration; carries its own role="img" and aria-label. */
  art: ReactNode;
}

/**
 * "?" button plus the rules dialog, shown one illustrated step at a time. A native modal <dialog> gives the
 * focus trap, Escape to close, focus return to the button and an inert scene behind it.
 */
export default function HowToPlay({ subtitle, cards }: { subtitle: string; cards: HelpCard[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const last = cards.length - 1;
  const card = cards[step];

  const open = () => {
    setStep(0);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();
  const go = (to: number) => setStep(Math.min(last, Math.max(0, to)));
  const next = () => (step === last ? close() : go(step + 1));

  return (
    <>
      <button type="button" className="cbtn help-btn" aria-label="How to play" title="How to play" onClick={open}>
        ?
      </button>
      <dialog
        ref={ref}
        className="help-dialog"
        aria-labelledby="help-title"
        // A click that lands on the <dialog> itself, not its content, is a click on the backdrop.
        onClick={(e) => e.target === e.currentTarget && close()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(step + 1);
          else if (e.key === 'ArrowLeft') go(step - 1);
        }}
      >
        <div className="help-body">
          <div className="help-head">
            <div>
              <h2 id="help-title">How to play</h2>
              <p>{subtitle}</p>
            </div>
            <button type="button" className="cbtn help-close" aria-label="Close" onClick={close}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="help-slide" role="group" aria-roledescription="slide" aria-label={`${step + 1} of ${cards.length}`} aria-live="polite">
            {card.art}
            <h3>{step + 1}. {card.title}</h3>
            <p>{card.text}</p>
          </div>

          <div className="help-nav">
            {/* aria-disabled rather than disabled: a disabled button would drop keyboard focus out of the dialog. */}
            <button type="button" className="cbtn help-back" onClick={() => go(step - 1)} aria-disabled={step === 0}>
              Back
            </button>
            <div className="help-progress">
              <div className="help-dots" aria-hidden="true">
                {cards.map((c, i) => <span key={c.title} className={i === step ? 'on' : undefined} />)}
              </div>
              <span>{step + 1} / {cards.length}</span>
            </div>
            <button type="button" className="cbtn help-next" onClick={next}>
              {step === last ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
