import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PiMicrophoneFill, PiMicrophoneSlash, PiHandPalm, PiPaperPlaneRightFill,
} from 'react-icons/pi';
import { useFooter } from '@/hooks/footer/use-footer';
import { useAiState } from '@/context/ai-state-context';
import { useVoiceState } from '@/hooks/utils/use-voice-state';
import { VoiceVisualizer } from './voice-visualizer';

/**
 * The composer under the conversation: voice status, microphone, stop, and text input.
 */
function Footer(): JSX.Element {
  const { t } = useTranslation();
  const { aiState } = useAiState();
  const voiceState = useVoiceState();
  const {
    inputValue,
    handleInputChange,
    handleKeyPress,
    handleSend,
    handleCompositionStart,
    handleCompositionEnd,
    handleInterrupt,
    handleMicToggle,
    micOn,
  } = useFooter();

  const statusLabel = voiceState === 'speaking' ? t('aiState.speaking') : t(`aiState.${aiState}`);
  const micLabel = t(micOn ? 'composer.micOn' : 'composer.micOff');

  return (
    <div className="yd-composer">
      <div className="yd-composer__status">
        <VoiceVisualizer state={voiceState} />
        <span>{statusLabel}</span>
      </div>

      <div className="yd-composer__row">
        <button
          type="button"
          className="yd-mic"
          aria-pressed={micOn}
          aria-label={micLabel}
          title={micLabel}
          data-hearing={voiceState === 'listening'}
          onClick={handleMicToggle}
        >
          {micOn ? <PiMicrophoneFill aria-hidden /> : <PiMicrophoneSlash aria-hidden />}
        </button>

        <button
          type="button"
          className="yd-stop"
          aria-label={t('composer.stop')}
          title={t('composer.stop')}
          onClick={handleInterrupt}
        >
          <PiHandPalm aria-hidden />
        </button>

        <div className="yd-input-wrap">
          <textarea
            id="yd-message"
            className="yd-input"
            rows={1}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={t('footer.typeYourMessage')}
            aria-label={t('composer.inputLabel')}
          />
          <button
            type="button"
            className="yd-send"
            aria-label={t('composer.send')}
            title={t('composer.send')}
            disabled={!inputValue.trim()}
            onClick={handleSend}
          >
            <PiPaperPlaneRightFill aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(Footer);
