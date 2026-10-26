import {
  memo, useCallback, useEffect, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { PiWarningCircle } from 'react-icons/pi';
import { useTranslationDirection } from '@/hooks/utils/use-voice-state';
import {
  useQuickPhrases, needsConfirmation, phraseSides, PhraseDirection, QuickPhrase,
} from '@/hooks/quick-phrases/use-quick-phrases';

interface ConfirmPhraseProps {
  said: string
  spoken: string
  onConfirm: () => void
  onCancel: () => void
}

/** Safety rule: a phrase with a number, dose or time is only spoken after a second tap */
function ConfirmPhrase({
  said, spoken, onConfirm, onCancel,
}: ConfirmPhraseProps): JSX.Element {
  const { t } = useTranslation();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="yd-dialog-backdrop" onClick={onCancel} role="presentation">
      <div
        className="yd-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="yd-confirm-title"
        aria-describedby="yd-confirm-body"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="yd-confirm-title" className="yd-dialog__title">
          <PiWarningCircle aria-hidden />
          {t('quick.confirmTitle')}
        </h2>
        <p id="yd-confirm-body" className="yd-dialog__body">{t('quick.confirmBody')}</p>
        <div className="yd-dialog__phrase" lang="th">
          <p className="yd-dialog__said">{said}</p>
          <p className="yd-dialog__spoken">{spoken}</p>
        </div>
        <div className="yd-dialog__actions">
          <button type="button" className="yd-btn yd-btn--quiet" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="yd-btn yd-btn--confirm" ref={confirmRef} onClick={onConfirm}>
            {t('quick.confirmSpeak')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The "most used" phrase bar above the composer. It follows the active character's
 * direction, and either direction can be picked by hand.
 */
function QuickPhrases(): JSX.Element {
  const { t } = useTranslation();
  const characterDirection = useTranslationDirection();
  const defaultDirection: PhraseDirection = characterDirection === 'patient' ? 'p2t' : 't2p';
  const [direction, setDirection] = useState<PhraseDirection>(defaultDirection);
  const [pending, setPending] = useState<QuickPhrase | null>(null);
  const { phrases, speak } = useQuickPhrases(direction);

  // Switching character resets the bar to that character's direction
  useEffect(() => setDirection(defaultDirection), [defaultDirection]);

  const pick = (phrase: QuickPhrase) => {
    if (needsConfirmation(phrase)) setPending(phrase);
    else speak(phrase);
  };

  const cancel = useCallback(() => setPending(null), []);
  const confirm = () => {
    if (pending) speak(pending);
    setPending(null);
  };

  return (
    <section className="yd-quick" aria-labelledby="yd-quick-title">
      <div className="yd-quick__head">
        <h2 id="yd-quick-title" className="yd-quick__title">{t('quick.title')}</h2>
        <div className="yd-segmented" role="radiogroup" aria-label={t('quick.direction')}>
          {(['t2p', 'p2t'] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              className="yd-segmented__option"
              onClick={() => setDirection(d)}
            >
              {t(`quick.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <ul className="yd-quick__list">
        {phrases.map((phrase) => {
          const { said, spoken } = phraseSides(phrase, direction);
          return (
            <li key={phrase.id}>
              <button type="button" className="yd-chip" lang="th" onClick={() => pick(phrase)} title={`${said} → ${spoken}`}>
                <span className="yd-chip__said">{said}</span>
                <span className="yd-chip__spoken">{spoken}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {pending && (
        <ConfirmPhrase {...phraseSides(pending, direction)} onConfirm={confirm} onCancel={cancel} />
      )}
    </section>
  );
}

export default memo(QuickPhrases);
