// «Спроси гида» и видео-экскурсовод раздела «История искусств».
//
// Гид отвечает через функцию ask-guide (Claude), строго про искусство и
// языком для детей. Имя ребёнка, телефон и другие данные профиля не
// отправляются: только текст вопросов этого разговора. Перед отправкой
// приложение и функция убирают из текста телефоны и адреса почты.
// Ответ гид читает вслух голосом самого телефона (expo-speech), бесплатно.
//
// Видео эпох лежат в Supabase Storage: art-history/videos/{эпоха}.mp4.
// Пока видео не загружено, на экране эпохи его нет.

import * as Speech from 'expo-speech';
import { supabase } from './supabase';
import type { Lang } from '../i18n';
import type { EraId } from './artHistory';
import type { HeroId } from './heroes';

export interface GuideMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Сколько вопросов в день можно задать гиду (проверяет сервер).
export const GUIDE_DAILY_LIMIT = 10;
export const GUIDE_MAX_QUESTION = 300;

export type GuideResult =
  | { ok: true; answer: string; remaining: number | null }
  | { ok: false; reason: 'limit' | 'unavailable' | 'error' };

const PHONE = /(\+?\d[\d\s()-]{8,}\d)/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// Убираем из текста номера телефонов и почту, даже если ребёнок их написал.
export function scrubPersonal(text: string): string {
  return text.replace(EMAIL, '[почта скрыта]').replace(PHONE, '[номер скрыт]');
}

export async function askGuide(
  history: GuideMessage[],
  lang: Lang,
  topic: { era?: EraId | null; hero?: HeroId | null } = {}
): Promise<GuideResult> {
  const messages = history.slice(-10).map((m) => ({
    role: m.role,
    content: scrubPersonal(m.content).slice(0, 1200),
  }));
  try {
    const { data, error } = await supabase.functions.invoke('ask-guide', {
      body: { messages, lang, era: topic.era ?? null, hero: topic.hero ?? null },
    });
    if (error) {
      // 429 — дневной лимит, 503 — гид выключен (нет ключа).
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 429) return { ok: false, reason: 'limit' };
      if (status === 503) return { ok: false, reason: 'unavailable' };
      return { ok: false, reason: 'error' };
    }
    const answer = typeof data?.answer === 'string' ? data.answer : '';
    if (!answer) return { ok: false, reason: 'error' };
    return { ok: true, answer, remaining: typeof data?.remaining === 'number' ? data.remaining : null };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// ---------- Голос ----------

const SPEECH_LANG: Record<Lang, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' };

// Голос гида. Системный голос по умолчанию часто самый простой и
// «роботный», поэтому выбираем лучший из установленных на телефоне:
// улучшенного качества (iOS: Enhanced/Premium, Android: сетевые голоса Google).
const voiceCache = new Map<Lang, Promise<string | undefined>>();

function voiceScore(v: Speech.Voice): number {
  const name = `${v.identifier} ${v.name}`.toLowerCase();
  let score = 0;
  if (v.quality === Speech.VoiceQuality.Enhanced) score += 10;
  if (name.includes('premium')) score += 6;
  if (name.includes('enhanced')) score += 4;
  if (name.includes('network')) score += 3;
  // Старые и «шуточные» голоса iOS звучат хуже всего.
  if (name.includes('compact') || name.includes('eloquence') || name.includes('novelty')) score -= 10;
  if (name.includes('local')) score -= 1;
  return score;
}

function bestVoice(lang: Lang): Promise<string | undefined> {
  let cached = voiceCache.get(lang);
  if (!cached) {
    const prefix = SPEECH_LANG[lang].slice(0, 2).toLowerCase();
    cached = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const matching = voices.filter((v) => v.language?.toLowerCase().replace('_', '-').startsWith(prefix));
        matching.sort((a, b) => voiceScore(b) - voiceScore(a));
        return matching[0]?.identifier;
      })
      .catch(() => undefined);
    voiceCache.set(lang, cached);
  }
  return cached;
}

// Номер последнего запроса: если за время поиска голоса нажали «Стоп»
// или запустили другой рассказ, старый не начинаем.
let speakToken = 0;

export function speak(text: string, lang: Lang, handlers: { onStart?: () => void; onEnd?: () => void } = {}) {
  Speech.stop();
  const token = ++speakToken;
  handlers.onStart?.();
  bestVoice(lang).then((voice) => {
    if (token !== speakToken) {
      handlers.onEnd?.();
      return;
    }
    Speech.speak(text, {
      language: SPEECH_LANG[lang],
      voice,
      // Чуть медленнее обычного, естественной высоты: так говорит экскурсовод.
      rate: 0.9,
      pitch: 1.0,
      onDone: handlers.onEnd,
      onStopped: handlers.onEnd,
      onError: handlers.onEnd,
    });
  });
}

export function stopSpeaking() {
  speakToken++;
  Speech.stop();
}

// ---------- Видео эпох ----------

let videosCache: Promise<Map<string, string>> | null = null;

export function eraVideos(): Promise<Map<string, string>> {
  if (!videosCache) {
    videosCache = supabase.storage
      .from('art-history')
      .list('videos', { limit: 100 })
      .then(({ data, error }) => {
        const files = new Map<string, string>();
        if (error || !data) {
          videosCache = null; // попробуем снова при следующем открытии
          return files;
        }
        for (const f of data) {
          const m = f.name.match(/^([a-z]+)\.(mp4|mov|m4v)$/i);
          if (m) {
            files.set(m[1].toLowerCase(), supabase.storage.from('art-history').getPublicUrl(`videos/${f.name}`).data.publicUrl);
          }
        }
        return files;
      })
      .catch(() => new Map<string, string>());
  }
  return videosCache;
}

export async function eraVideoUrl(eraId: EraId): Promise<string | null> {
  const files = await eraVideos();
  return files.get(eraId) ?? null;
}
