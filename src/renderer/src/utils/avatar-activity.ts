import { create } from 'zustand';

/**
 * What the avatar is doing right now, shared by the sprite VTuber and the chat avatar
 */
interface AvatarActivityState {
  /** True while a voice clip is playing */
  speaking: boolean;

  /** Loudness of the voice at this moment, 0 to 1, from the backend's volume slices */
  mouthLevel: number;

  setSpeaking: (speaking: boolean) => void;
  setMouthLevel: (mouthLevel: number) => void;
}

export const useAvatarActivity = create<AvatarActivityState>((set) => ({
  speaking: false,
  mouthLevel: 0,
  setSpeaking: (speaking) => set({ speaking }),
  setMouthLevel: (mouthLevel) => set({ mouthLevel }),
}));
