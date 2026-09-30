import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    // Push-токен недоступен (например, нет projectId в EAS или запуск в Expo Go
    // без поддержки удалённых пушей) — приложение продолжает работать без пушей.
    console.warn('Push-уведомления недоступны:', e instanceof Error ? e.message : e);
    return null;
  }
}

// Push-токен хранится в закрытой таблице push_tokens: клиент не может её
// читать, а записывает свой токен только через RPC register_push_token.
export async function syncPushToken() {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  const { error } = await supabase.rpc('register_push_token', { p_token: token });
  if (error) {
    console.warn('Не удалось сохранить push-токен:', error.message);
  }
}

export async function clearPushToken() {
  await supabase.rpc('clear_push_token');
}

// Клиент сообщает только о событии — получателей, текст и право на отправку
// определяет Edge Function send-push по данным в базе.
export type PushEvent =
  | { event: 'post_comment'; id: string } // id комментария
  | { event: 'post_moderated'; id: string } // id публикации
  | { event: 'listing_moderated'; id: string } // id объявления о продаже
  | { event: 'announcement'; id: string }; // id объявления

export async function sendPushNotification(pushEvent: PushEvent) {
  try {
    await supabase.functions.invoke('send-push', { body: pushEvent });
  } catch (e) {
    // Отправка пушей не должна ломать основное действие пользователя (создание
    // объявления, комментария и т.д.), поэтому ошибку только логируем.
    console.warn('Не удалось отправить push-уведомление:', e instanceof Error ? e.message : e);
  }
}
