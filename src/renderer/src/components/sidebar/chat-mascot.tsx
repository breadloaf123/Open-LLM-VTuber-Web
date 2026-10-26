/*
 * Chat avatar built on page-mascot's two-sheet sprite approach
 * (https://github.com/nilbuild/page-mascot, MIT licence).
 * Adapted: a still mode for older messages, and reactions driven by the chat state.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const DIRECTIONS = [
  'up-left', 'up', 'up-right',
  'left', 'center', 'right',
  'down-left', 'down', 'down-right',
] as const;

const REACTIONS = [
  'blink', 'heart', 'sparkle',
  'surprised', 'wink', 'bashful',
  'sleepy', 'dizzy', 'delighted',
] as const;

type Direction = (typeof DIRECTIONS)[number];
type Reaction = (typeof REACTIONS)[number];

/** What the conversation is doing, as far as the chat avatar cares */
export type ChatMascotState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Clockwise from the right, matching atan2 with y pointing down.
const CLOCKWISE: Direction[] = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const DEAD_ZONE = 40;
const PAYOFFS: Reaction[] = ['heart', 'sparkle', 'delighted'];

const layer: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundSize: '300% 300%',
  backgroundRepeat: 'no-repeat',
};

// background-size 300% makes each cell a clean 0/50/100% step on both axes.
function cell(index: number): CSSProperties {
  return { backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%` };
}

interface ChatMascotProps {
  /** The 3x3 sheet of head directions */
  directions: string;
  /** The 3x3 sheet of expressions */
  reactions: string;
  size?: number;
  /** Only the newest bot message's avatar moves; older ones stay still */
  live?: boolean;
  state?: ChatMascotState;
  label?: string;
}

export function ChatMascot({
  directions, reactions, size = 40, live = false, state = 'idle', label = 'avatar',
}: ChatMascotProps): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [direction, setDirection] = useState<Direction>('center');
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [boop, setBoop] = useState<Reaction | null>(null);

  // Follow the pointer while idle, on devices that have one
  useEffect(() => {
    if (!live || state !== 'idle') return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const onMove = (event: PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        setDirection('center');
        return;
      }
      const sector = (Math.round(Math.atan2(dy, dx) / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [live, state]);

  // State-driven face: blink while idle, glance up while thinking, smile in rhythm while speaking
  useEffect(() => {
    setDirection('center');
    setReaction(null);
    if (!live) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | undefined;

    if (state === 'idle') {
      const blink = () => {
        timers.push(setTimeout(() => {
          setReaction('blink');
          timers.push(setTimeout(() => setReaction(null), 150));
          blink();
        }, 3200 + Math.random() * 2400));
      };
      blink();
    } else if (state === 'thinking') {
      let up = false;
      setDirection('up-right');
      interval = setInterval(() => {
        up = !up;
        setDirection(up ? 'up-left' : 'up-right');
      }, reduced ? 1600 : 900);
    } else if (state === 'speaking') {
      let open = false;
      interval = setInterval(() => {
        open = !open;
        setReaction(open ? 'delighted' : null);
      }, reduced ? 650 : 240);
    }

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [live, state]);

  const handleClick = () => {
    if (!live) return;
    setBoop('blink');
    setTimeout(() => setBoop(PAYOFFS[Math.floor(Math.random() * PAYOFFS.length)]), 120);
    setTimeout(() => setBoop(null), 560);
  };

  const shown = boop ?? reaction;

  return (
    <span
      ref={ref}
      role="img"
      aria-label={label}
      onClick={handleClick}
      style={{
        position: 'relative',
        display: 'block',
        flexShrink: 0,
        width: size,
        height: size,
        cursor: live ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          ...layer,
          backgroundImage: `url(${directions})`,
          ...cell(DIRECTIONS.indexOf(direction)),
          opacity: shown ? 0 : 1,
        }}
      />
      {/* Always mounted so the sheet is fetched up front */}
      <span
        style={{
          ...layer,
          backgroundImage: `url(${reactions})`,
          ...cell(REACTIONS.indexOf(shown ?? 'blink')),
          opacity: shown ? 1 : 0,
        }}
      />
    </span>
  );
}
