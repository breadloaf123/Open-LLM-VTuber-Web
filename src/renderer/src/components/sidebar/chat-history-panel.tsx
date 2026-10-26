import { useEffect, useRef } from 'react';
import { Spinner } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import {
  PiWaveform, PiTranslate, PiWrench, PiCheck, PiX,
} from 'react-icons/pi';
import { useChatHistory } from '@/context/chat-history-context';
import { useConfig } from '@/context/character-config-context';
import { useWebSocket } from '@/context/websocket-context';
import { useLive2DConfig } from '@/context/live2d-config-context';
import { useVoiceState, useTranslationDirection } from '@/hooks/utils/use-voice-state';
import markLight from '@/assets/brand/logo-mark-light.png';
import markDark from '@/assets/brand/logo-mark-dark.png';
import { ChatMascot, ChatMascotState } from './chat-mascot';

/** Labels for what was said and for its translation, per translation direction */
const LABEL_KEYS = {
  patient: { source: 'conversation.patientSpeech', translation: 'conversation.toThai' },
  doctor: { source: 'conversation.doctorSpeech', translation: 'conversation.toPattani' },
  chat: { source: 'conversation.you', translation: null },
} as const;

/** "14:05" from the message's ISO timestamp */
function clockTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * The conversation: each turn shows what was said (small) and its translation (a card).
 * The newest translation is set large so it can be read from across the desk.
 */
function ChatHistoryPanel(): JSX.Element {
  const { t } = useTranslation();
  const { messages } = useChatHistory();
  const { confName } = useConfig();
  const { baseUrl } = useWebSocket();
  const { modelInfo } = useLive2DConfig();
  const voiceState = useVoiceState();
  const direction = useTranslationDirection();
  const listRef = useRef<HTMLDivElement>(null);

  const validMessages = messages.filter((msg) => msg.content
    || (msg.type === 'tool_call_status' && ['running', 'completed', 'error'].includes(msg.status ?? '')));

  // Chat avatar from the character's sprite sheets; only the newest bot message's one moves
  const chatSheets = modelInfo?.sprite?.chatDirections && modelInfo.sprite.chatReactions
    ? { directions: modelInfo.sprite.chatDirections, reactions: modelInfo.sprite.chatReactions }
    : null;
  const lastAiId = [...validMessages].reverse().find((msg) => msg.role === 'ai' && msg.type !== 'tool_call_status')?.id;
  const mascotState: ChatMascotState = {
    speaking: 'speaking', translating: 'thinking', listening: 'listening', ready: 'listening', idle: 'idle',
  }[voiceState] as ChatMascotState;

  // Follow new messages, unless the reader has scrolled up to look at older ones
  const lastContent = validMessages[validMessages.length - 1]?.content;
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 160;
    if (nearBottom) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      list.scrollTo({ top: list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }
  }, [validMessages.length, lastContent]);

  const labels = LABEL_KEYS[direction];
  const aiName = (name?: string) => name || confName || 'AI';

  return (
    <div ref={listRef} className="yd-chat" data-direction={direction} role="log" aria-live="polite">
      {validMessages.length === 0 && (
        <div className="yd-empty">
          <img className="yd-only-light" src={markLight} alt="" />
          <img className="yd-only-dark" src={markDark} alt="" />
          <p className="yd-empty__title">{t('conversation.emptyTitle')}</p>
          <p className="yd-empty__hint">{t('conversation.emptyHint')}</p>
        </div>
      )}

      {validMessages.map((msg) => {
        if (msg.type === 'tool_call_status') {
          return (
            <div key={msg.id} className="yd-tool">
              <PiWrench aria-hidden />
              <span>
                {msg.status === 'running'
                  ? `${msg.name} is using tool ${msg.tool_name}`
                  : `${msg.name} used tool ${msg.tool_name}`}
              </span>
              {msg.status === 'running' && <Spinner size="xs" />}
              {msg.status === 'completed' && <PiCheck aria-hidden />}
              {msg.status === 'error' && <PiX aria-hidden />}
            </div>
          );
        }

        if (msg.role === 'human') {
          return (
            <div key={msg.id} className="yd-msg yd-msg--source">
              <div className="yd-msg__label">
                <PiWaveform aria-hidden />
                <span>{t(labels.source)}</span>
                <time className="yd-msg__time">{clockTime(msg.timestamp)}</time>
              </div>
              <p className="yd-msg__text" style={{ margin: 0 }}>{msg.content}</p>
            </div>
          );
        }

        const isLatest = msg.id === lastAiId;
        let avatar: React.ReactNode = aiName(msg.name)[0].toUpperCase();
        if (chatSheets) {
          avatar = (
            <ChatMascot
              directions={chatSheets.directions}
              reactions={chatSheets.reactions}
              size={44}
              live={isLatest}
              state={mascotState}
              label={aiName(msg.name)}
            />
          );
        } else if (msg.avatar) {
          avatar = <img src={`${baseUrl}/avatars/${msg.avatar}`} alt="" width="100%" height="100%" />;
        }

        return (
          <div key={msg.id} className={isLatest ? 'yd-msg yd-msg--translation yd-msg--latest' : 'yd-msg yd-msg--translation'}>
            <div className="yd-msg__avatar">{avatar}</div>
            <div className="yd-card">
              <div className="yd-msg__label">
                <PiTranslate aria-hidden />
                <span>{labels.translation ? t(labels.translation) : aiName(msg.name)}</span>
                <time className="yd-msg__time">{clockTime(msg.timestamp)}</time>
              </div>
              <p className="yd-msg__text" style={{ margin: 0 }}>{msg.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ChatHistoryPanel;
