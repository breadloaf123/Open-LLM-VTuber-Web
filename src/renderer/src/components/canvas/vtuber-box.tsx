import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubtitle } from '@/context/subtitle-context';
import { useChatHistory } from '@/context/chat-history-context';
import { useVoiceState } from '@/hooks/utils/use-voice-state';
import { useIsPhone } from '@/hooks/utils/use-is-phone';

/** How long a notice stays in the bubble under the avatar */
const CAPTION_MS = 6000;

interface VtuberBoxProps {
  /** Desktop-app pet mode: the avatar fills the transparent window */
  pet: boolean
  children: React.ReactNode
}

/**
 * The small VTuber stage at the top right. Its border lights up while she listens or speaks,
 * and a bubble under it shows short notices (new conversation, errors) from the server.
 * The markup is the same in pet mode so the avatar stays mounted when the mode changes.
 */
function VtuberBox({ pet, children }: VtuberBoxProps): JSX.Element {
  const { t } = useTranslation();
  const voiceState = useVoiceState();
  const isPhone = useIsPhone();
  const { subtitleText } = useSubtitle();
  const { messages } = useChatHistory();
  const [collapsed, setCollapsed] = useState(false);
  const [caption, setCaption] = useState('');

  // Show notices only: a sentence that is already in the chat doesn't need repeating here
  useEffect(() => {
    const inChat = messages.slice(-6).some((m) => m.role === 'ai' && m.content === subtitleText);
    if (!subtitleText || inChat) {
      setCaption('');
      return undefined;
    }
    setCaption(subtitleText);
    const timer = setTimeout(() => setCaption(''), CAPTION_MS);
    return () => clearTimeout(timer);
    // Only a new subtitle starts a notice; new chat messages shouldn't re-show an old one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitleText]);

  return (
    <aside
      className={pet ? 'yd-vtuber yd-vtuber--pet' : 'yd-vtuber'}
      data-state={voiceState}
      data-collapsed={isPhone && collapsed}
      aria-label={t('vtuber.label')}
    >
      <div className="yd-vtuber__frame">
        {children}
        {isPhone && !pet && (
          <button
            type="button"
            className="yd-vtuber__toggle"
            aria-expanded={!collapsed}
            aria-label={t(collapsed ? 'vtuber.expand' : 'vtuber.shrink')}
            onClick={() => setCollapsed((c) => !c)}
          />
        )}
      </div>
      {!pet && caption && !(isPhone && collapsed) && (
        <p className="yd-vtuber__caption" role="status">{caption}</p>
      )}
    </aside>
  );
}

export default memo(VtuberBox);
