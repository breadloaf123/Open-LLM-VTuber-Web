import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import phraseBank from '@/data/quick-phrases.json';
import { useWebSocket } from '@/context/websocket-context';
import { useChatHistory } from '@/context/chat-history-context';
import { useAiState } from '@/context/ai-state-context';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useAudioTask } from '@/hooks/utils/use-audio-task';
import { toaster } from '@/components/ui/toaster';

/** "t2p": the doctor's Thai spoken in Pattani Malay; "p2t": the patient's Pattani Malay spoken in Thai */
export type PhraseDirection = 't2p' | 'p2t';

export interface QuickPhrase {
  id: string
  thai: string
  pattani: string
  source: string
  confirm?: boolean
}

const PHRASES: Record<PhraseDirection, QuickPhrase[]> = {
  t2p: phraseBank.thaiToPattani,
  p2t: phraseBank.pattaniToThai,
};

/** Per-device usage counts, so the most used phrases come first */
const USAGE_KEY = 'yawidoc.quickPhraseUsage';
const SLICE_MS = 20;
const TTS_TIMEOUT_MS = 20000;

/** Digits (Arabic or Thai) and number / dose / frequency words: speak only after confirmation */
const NUMBER_OR_FREQUENCY = /[0-9๐-๙]|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ครั้ง|เม็ด|วันละ|ชั่วโมง|ช้อน|มิลลิ|ซีซี/;

export function needsConfirmation(phrase: QuickPhrase): boolean {
  return Boolean(phrase.confirm) || NUMBER_OR_FREQUENCY.test(phrase.thai);
}

/** The phrase as the speaker says it, and as it is spoken to the listener */
export function phraseSides(phrase: QuickPhrase, direction: PhraseDirection): { said: string; spoken: string } {
  return direction === 't2p'
    ? { said: phrase.thai, spoken: phrase.pattani }
    : { said: phrase.pattani, spoken: phrase.thai };
}

function readUsage(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeUsage(usage: Record<string, number>): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {
    // Storage can be blocked (private window); ordering then just isn't remembered
  }
}

/** Ask the server's /tts-ws to speak the text; resolves with the audio file paths */
function synthesize(ttsUrl: string, text: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(ttsUrl);
    const paths: string[] = [];
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Speech service timed out'));
    }, TTS_TIMEOUT_MS);
    ws.onopen = () => ws.send(JSON.stringify({ text }));
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'partial' && data.audioPath) {
        paths.push(data.audioPath);
      } else if (data.status === 'complete') {
        clearTimeout(timer);
        ws.close();
        resolve(paths);
      } else if (data.status === 'error') {
        clearTimeout(timer);
        ws.close();
        reject(new Error(data.message || 'Speech service error'));
      }
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Speech service unreachable'));
    };
  });
}

/** Fetch a generated clip and measure its loudness per slice, for lip sync */
async function loadClip(baseUrl: string, audioPath: string): Promise<{ base64: string; volumes: number[] }> {
  const path = audioPath.replace(/\\/g, '/').replace(/^\.?\//, '');
  const response = await fetch(`${baseUrl}/${path}`);
  if (!response.ok) throw new Error(`Audio file not found (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());

  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  let volumes: number[] = [];
  try {
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes.buffer.slice(0));
    context.close();
    const samples = decoded.getChannelData(0);
    const step = Math.max(1, Math.round((decoded.sampleRate * SLICE_MS) / 1000));
    for (let i = 0; i < samples.length; i += step) {
      let sum = 0;
      const end = Math.min(samples.length, i + step);
      for (let j = i; j < end; j += 1) sum += samples[j] * samples[j];
      volumes.push(Math.sqrt(sum / (end - i)));
    }
    const peak = Math.max(...volumes, 1e-6);
    volumes = volumes.map((v) => v / peak);
  } catch {
    // Without volumes the clip still plays; the mouth just stays closed
    volumes = [];
  }

  return { base64: btoa(binary), volumes };
}

/**
 * Quick phrases for one direction, most used first, and a way to speak one.
 * Phrases come straight from the phrase bank: no machine translation, no LLM.
 */
export function useQuickPhrases(direction: PhraseDirection) {
  const { t } = useTranslation();
  const { wsUrl, baseUrl } = useWebSocket();
  const { appendPhrasebookTurn } = useChatHistory();
  const { aiState, setAiState } = useAiState();
  const { interrupt } = useInterrupt();
  const { addAudioTask } = useAudioTask();

  // Ordered by the counts as they were when the bar opened (or the direction changed),
  // so a chip never jumps away from under the finger that just tapped it
  const phrases = useMemo(() => {
    const usage = readUsage();
    return PHRASES[direction]
      .map((phrase, order) => ({ phrase, order }))
      .sort((a, b) => (usage[b.phrase.id] ?? 0) - (usage[a.phrase.id] ?? 0) || a.order - b.order)
      .map(({ phrase }) => phrase);
  }, [direction]);

  const speak = useCallback(async (phrase: QuickPhrase) => {
    const { said, spoken } = phraseSides(phrase, direction);

    const usage = readUsage();
    writeUsage({ ...usage, [phrase.id]: (usage[phrase.id] ?? 0) + 1 });

    // A phrase takes over from a reply that is still playing
    if (aiState === 'thinking-speaking') interrupt();
    setAiState('idle');

    appendPhrasebookTurn(said, spoken, direction === 't2p' ? 'doctor' : 'patient');

    try {
      const ttsUrl = wsUrl.replace(/\/client-ws\/?$/, '/tts-ws');
      const paths = await synthesize(ttsUrl, spoken);
      for (const path of paths) {
        // eslint-disable-next-line no-await-in-loop
        const clip = await loadClip(baseUrl, path);
        addAudioTask({
          audioBase64: clip.base64,
          volumes: clip.volumes,
          sliceLength: SLICE_MS,
          displayText: null,
          forwarded: true,
        });
      }
    } catch (error) {
      console.error('Quick phrase playback failed:', error);
      toaster.create({
        title: t('quick.speakFailed'),
        description: t('quick.speakFailedHint'),
        type: 'error',
        duration: 6000,
      });
    }
  }, [direction, aiState, interrupt, setAiState, appendPhrasebookTurn, wsUrl, baseUrl, addAudioTask, t]);

  return { phrases, speak };
}
