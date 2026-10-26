import { useAiState } from '@/context/ai-state-context';
import { useConfig } from '@/context/character-config-context';
import { useVAD } from '@/context/vad-context';
import { useAvatarActivity } from '@/utils/avatar-activity';

/**
 * What the voice side of the app is doing, for the voice indicator, the VTuber box
 * and the chat avatar. "ready" means the microphone is on and waiting for speech.
 */
export type VoiceState = 'idle' | 'ready' | 'listening' | 'translating' | 'speaking';

export function useVoiceState(): VoiceState {
  const { aiState } = useAiState();
  const { micOn } = useVAD();
  const speaking = useAvatarActivity((s) => s.speaking);

  if (speaking) return 'speaking';
  if (aiState === 'listening') return 'listening';
  if (aiState === 'thinking-speaking' || aiState === 'loading') return 'translating';
  if (micOn) return 'ready';
  return 'idle';
}

/**
 * Which way the active character translates, from its conf_uid:
 * "patient" = Pattani Malay speech to Thai, "doctor" = Thai speech to Pattani Malay,
 * "chat" = any other character.
 */
export type TranslationDirection = 'patient' | 'doctor' | 'chat';

export function useTranslationDirection(): TranslationDirection {
  const { confUid } = useConfig();
  if (confUid.includes('pattani_thai')) return 'patient';
  if (confUid.includes('thai_pattani')) return 'doctor';
  return 'chat';
}
