import { create } from 'zustand';

/**
 * What the avatar is doing right now, shared by the sprite VTuber and the chat avatar
 */
interface AvatarActivityState {
  /** True while a voice clip is playing */
  speaking: boolean;

  /** Loudness of the voice at this moment, 0 to 1, from the backend's volume slices */
  mouthLevel: number;

  /** How likely the microphone is hearing speech right now, 0 to 1, from the VAD */
  voiceLevel: number;

  setSpeaking: (speaking: boolean) => void;
  setMouthLevel: (mouthLevel: number) => void;
  setVoiceLevel: (voiceLevel: number) => void;
}

export const useAvatarActivity = create<AvatarActivityState>((set) => ({
  speaking: false,
  mouthLevel: 0,
  voiceLevel: 0,
  setSpeaking: (speaking) => set({ speaking }),
  setMouthLevel: (mouthLevel) => set({ mouthLevel }),
  setVoiceLevel: (voiceLevel) => set({ voiceLevel }),
}));
