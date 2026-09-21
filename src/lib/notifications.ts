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

export async function syncPushToken(userId: string, currentToken: string | null) {
  const token = await registerForPushNotificationsAsync();
  if (token && token !== currentToken) {
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  }
}

interface SendPushParams {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification({ userIds, title, body, data }: SendPushParams) {
  const recipients = userIds.filter(Boolean);
  if (recipients.length === 0) return;
  try {
    await supabase.functions.invoke('send-push', {
      body: { userIds: recipients, title, body, data },
    });
  } catch (e) {
    // Отправка пушей не должна ломать основное действие пользователя (создание
    // объявления, комментария и т.д.), поэтому ошибку только логируем.
    console.warn('Не удалось отправить push-уведомление:', e instanceof Error ? e.message : e);
  }
}
