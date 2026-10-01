import { Alert, Linking } from 'react-native';
import { supabase } from './supabase';

// Ссылка из письма Supabase (подтверждение почты) после проверки ведёт сюда.
// Адрес нужно добавить в Supabase → Authentication → URL Configuration →
// Redirect URLs, иначе Supabase отправит на Site URL (по умолчанию localhost).
export const AUTH_REDIRECT_URL = 'kasteyevschool://auth-callback';

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

async function handleAuthUrl(url: string | null) {
  if (!url || !url.startsWith(AUTH_REDIRECT_URL)) return;
  const params = parseParams(url);
  if (params.error_description || params.error) {
    Alert.alert(
      'Ссылка не сработала',
      'Возможно, она устарела или уже использована. Попробуйте просто войти с вашим email и паролем.'
    );
    return;
  }
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) {
      Alert.alert('Почта подтверждена', 'Теперь войдите с вашим email и паролем.');
    }
  }
}

// Обрабатывает ссылку, которой открыли приложение, и ссылки, пришедшие, пока оно работает.
export function listenForAuthLinks(): () => void {
  Linking.getInitialURL().then(handleAuthUrl).catch(() => {});
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleAuthUrl(url);
  });
  return () => subscription.remove();
}
