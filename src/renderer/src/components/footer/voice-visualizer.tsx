import type { CSSProperties } from 'react';
import { useAvatarActivity } from '@/utils/avatar-activity';
import type { VoiceState } from '@/hooks/utils/use-voice-state';

/**
 * The logo's "· | ·" as a live voice indicator: the capsule follows the microphone
 * while listening and the reply's loudness while speaking, and shimmers while translating.
 */
export function VoiceVisualizer({ state }: { state: VoiceState }): JSX.Element {
  const level = useAvatarActivity((s) => {
    if (state === 'speaking') return s.mouthLevel;
    if (state === 'listening') return s.voiceLevel;
    return 0;
  });
  const follows = state === 'speaking' || state === 'listening';
  const style = follows
    ? ({ '--yd-level': 0.3 + 0.7 * Math.min(1, level) } as CSSProperties)
    : undefined;

  return (
    <span className="yd-voice" data-state={state} style={style} aria-hidden="true">
      <span className="yd-voice__dot" />
      <span className="yd-voice__bar" />
      <span className="yd-voice__dot" />
    </span>
  );
}
