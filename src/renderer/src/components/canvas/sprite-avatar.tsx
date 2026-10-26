import { memo, useEffect, useRef, useState } from 'react';
import { useLive2DConfig } from '@/context/live2d-config-context';
import { useAiState } from '@/context/ai-state-context';
import { useIpcHandlers } from '@/hooks/utils/use-ipc-handlers';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useAudioTask } from '@/hooks/utils/use-audio-task';
import { useMode } from '@/context/mode-context';
import { useForceIgnoreMouse } from '@/hooks/utils/use-force-ignore-mouse';
import { useAvatarActivity } from '@/utils/avatar-activity';

/** Cells of the talking sheet, left to right, top to bottom */
const FRAME = {
  rest: 0,
  slight: 1,
  aah: 2,
  ooh: 3,
  wide: 4,
  half: 5,
  closed: 6,
  listen: 7,
  happy: 8,
} as const;

/** Blink: half-closed, closed, half-closed, in ms per frame */
const BLINK: [number, number][] = [[FRAME.half, 60], [FRAME.closed, 90], [FRAME.half, 60]];

/** Below this loudness the mouth is closed */
const SILENCE = 0.12;

/** background-size 300% turns each cell into a clean 0/50/100% step on both axes */
function cellPosition(index: number): string {
  return `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`;
}

/**
 * Pick a mouth frame for the current loudness. `shape` is the open vowel chosen for
 * the current syllable, so the mouth does not flicker between "aah" and "ooh".
 */
function mouthFrame(level: number, shape: number): number {
  if (level < SILENCE) return FRAME.rest;
  if (level < 0.35) return FRAME.slight;
  if (level < 0.8) return shape;
  return FRAME.wide;
}

interface SpriteAvatarProps {
  /** Share of the stage height kept clear at the bottom, for a footer that overlays it */
  bottomInset?: number
  /** Size against the stage height; overrides the model's kScale (the phone stage is short) */
  fitScale?: number
}

/**
 * A VTuber drawn from picture frames instead of a Live2D model. Used when the
 * character's model_dict entry has `avatarType: "sprite"`.
 */
export const SpriteAvatar = memo(({ bottomInset = 0.12, fitScale }: SpriteAvatarProps): JSX.Element => {
  const { modelInfo } = useLive2DConfig();
  const { aiState } = useAiState();
  const { mode } = useMode();
  const { forceIgnoreMouse } = useForceIgnoreMouse();
  const speaking = useAvatarActivity((s) => s.speaking);
  const mouthLevel = useAvatarActivity((s) => s.mouthLevel);
  const [blink, setBlink] = useState<number | null>(null);
  const [tapped, setTapped] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<number>(FRAME.aah);
  const openRef = useRef(false);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  // Same app-level hooks the Live2D component runs
  useIpcHandlers();
  useInterrupt();
  useAudioTask();

  // Track the stage size so the frame stays square on any screen
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Blink every few seconds, except while talking
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(async () => {
        if (!speakingRef.current) {
          for (const [frame, ms] of BLINK) {
            if (cancelled) return;
            setBlink(frame);
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => { setTimeout(r, ms); });
          }
          setBlink(null);
        }
        if (!cancelled) schedule();
      }, 2600 + Math.random() * 3200);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // A new syllable starts when the mouth opens from silence: pick its vowel then
  const open = mouthLevel >= SILENCE;
  if (open && !openRef.current) {
    shapeRef.current = Math.random() < 0.3 ? FRAME.ooh : FRAME.aah;
  }
  openRef.current = open;

  let frame: number;
  if (tapped) {
    frame = FRAME.happy;
  } else if (speaking) {
    frame = mouthFrame(mouthLevel, shapeRef.current);
  } else if (blink !== null) {
    frame = blink;
  } else if (aiState === 'listening' || aiState === 'waiting' || aiState === 'thinking-speaking') {
    frame = FRAME.listen;
  } else {
    frame = FRAME.rest;
  }

  const handleTap = () => {
    setTapped(true);
    setTimeout(() => setTapped(false), 700);
  };

  const talk = modelInfo?.sprite?.talk;
  const scale = fitScale ?? Math.min(1.15, Math.max(0.4, Number(modelInfo?.kScale) || 1));
  const isPet = mode === 'pet';
  // Leave the bottom of the stage for the footer, which overlays it in window mode
  const bottom = isPet ? 0 : box.height * bottomInset;
  const side = Math.min((box.height - bottom) * 0.86 * scale, box.width);

  return (
    <div
      ref={containerRef}
      id="sprite-avatar"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: isPet && forceIgnoreMouse ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes sprite-avatar-breathe { 50% { transform: translateY(-0.6%) scale(1.006); } }
        #sprite-avatar .breathe { animation: sprite-avatar-breathe 4.6s ease-in-out infinite; transform-origin: 50% 100%; }
        @media (prefers-reduced-motion: reduce) { #sprite-avatar .breathe { animation: none; } }
      `}</style>
      {talk && side > 0 && (
        <div
          className="breathe"
          style={{
            position: 'absolute',
            left: (box.width - side) / 2,
            bottom,
            width: side,
            height: side,
          }}
        >
          <button
            type="button"
            aria-label={modelInfo?.name ?? 'avatar'}
            onClick={handleTap}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              padding: 0,
              border: 0,
              cursor: 'pointer',
              backgroundColor: 'transparent',
              backgroundImage: `url(${talk})`,
              backgroundSize: '300% 300%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: cellPosition(frame),
            }}
          />
        </div>
      )}
    </div>
  );
});

SpriteAvatar.displayName = 'SpriteAvatar';
