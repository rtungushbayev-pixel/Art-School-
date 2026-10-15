import { pick } from '../i18n';

const STRINGS = {
  ru: {
    rateLimited: 'Слишком часто. Подождите немного и попробуйте снова.',
    notAllowed: 'Это действие недоступно.',
  },
  kk: {
    rateLimited: 'Тым жиі. Біраз күтіп, қайталап көріңіз.',
    notAllowed: 'Бұл әрекет қолжетімсіз.',
  },
  en: {
    rateLimited: 'Too many attempts. Please wait a little and try again.',
    notAllowed: 'This action is not available.',
  },
};

// Понятный текст ошибки для Alert. Ошибки Supabase — не Error, а объекты
// с полем message, поэтому смотрим и на них.
export function errorText(e: unknown): string | undefined {
  const message =
    e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as any).message) : undefined;
  if (!message) return undefined;
  const s = pick(STRINGS);
  if (message.includes('rate_limited')) return s.rateLimited;
  if (message.includes('row-level security')) return s.notAllowed;
  return message;
}
