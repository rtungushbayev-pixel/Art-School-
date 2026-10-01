import { Alert, Linking } from 'react-native';
import { supabase } from './supabase';
import { pick } from '../i18n';

const STRINGS = {
  ru: {
    linkFailed: 'Ссылка не сработала',
    linkFailedText: 'Возможно, она устарела или уже использована. Попробуйте просто войти с вашим email и паролем.',
    emailConfirmed: 'Почта подтверждена',
    emailConfirmedText: 'Теперь войдите с вашим email и паролем.',
  },
  kk: {
    linkFailed: 'Сілтеме жұмыс істемеді',
    linkFailedText: 'Мүмкін, оның мерзімі өтіп кеткен немесе ол бұрын қолданылған. Email мен құпиясөзіңіз арқылы кіріп көріңіз.',
    emailConfirmed: 'Пошта расталды',
    emailConfirmedText: 'Енді email мен құпиясөзіңіз арқылы кіріңіз.',
  },
  en: {
    linkFailed: 'The link did not work',
    linkFailedText: 'It may have expired or already been used. Try simply signing in with your email and password.',
    emailConfirmed: 'Email confirmed',
    emailConfirmedText: 'Now sign in with your email and password.',
  },
};

// Ссылка из письма Supabase (подтверждение почты) после проверки ведёт сюда.
// Адрес нужно добавить в Supabase → Authentication → URL Configuration →
// Redirect URLs, иначе Supabase отправит на Site URL (по умолчанию localhost).
export const AUTH_REDIRECT_URL = 'kasteyevschool://auth-callback';
// Ссылка из письма «Сбросить пароль»: после входа по ней — экран нового пароля.
export const PASSWORD_RESET_URL = 'kasteyevschool://reset-password';

// Supabase передаёт токены во фрагменте после «#» (а ошибки иногда в query).
function parseParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = [url.split('#')[1], url.split('?')[1]?.split('#')[0]];
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return params;
}

async function handleAuthUrl(url: string | null, onRecovery: () => void) {
  if (!url || !(url.startsWith(AUTH_REDIRECT_URL) || url.startsWith(PASSWORD_RESET_URL))) return;
  const params = parseParams(url);
  const isRecovery = url.startsWith(PASSWORD_RESET_URL) || params.type === 'recovery';
  const s = pick(STRINGS);
  if (params.error_description || params.error) {
    Alert.alert(s.linkFailed, s.linkFailedText);
    return;
  }
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) {
      Alert.alert(isRecovery ? s.linkFailed : s.emailConfirmed, isRecovery ? s.linkFailedText : s.emailConfirmedText);
    } else if (isRecovery) {
      onRecovery();
    }
  }
}

// Обрабатывает ссылку, которой открыли приложение, и ссылки, пришедшие, пока оно работает.
// onRecovery вызывается, когда пользователь вошёл по ссылке сброса пароля.
export function listenForAuthLinks(onRecovery: () => void): () => void {
  Linking.getInitialURL()
    .then((url) => handleAuthUrl(url, onRecovery))
    .catch(() => {});
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleAuthUrl(url, onRecovery);
  });
  return () => subscription.remove();
}
