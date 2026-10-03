import { useCallback, useEffect, useRef } from 'react';
import { isStaffRole } from './roles';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { UserRole } from '../types/database';
import type { ParentStackParamList, StaffStackParamList, StudentStackParamList } from '../navigation/types';

// Экран, который открывается по нажатию на уведомление. Поле `data` задаёт
// отправитель (см. вызовы sendPushNotification), поэтому оно разбирается
// защитно: неизвестный тип или битые ID — просто открываем приложение.
type NotificationTarget =
  | { screen: 'PostDetail'; postId: string }
  | { screen: 'ListingDetail'; listingId: string }
  | { screen: 'Announcements' }
  | { screen: 'SupportTicket'; ticketId: string };

function asId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function resolveNotificationTarget(data: Record<string, unknown> | undefined): NotificationTarget | null {
  if (!data) return null;
  switch (data.type) {
    case 'post_comment':
    case 'post_moderated': {
      const postId = asId(data.postId);
      return postId ? { screen: 'PostDetail', postId } : null;
    }
    case 'listing_moderated': {
      const listingId = asId(data.listingId);
      return listingId ? { screen: 'ListingDetail', listingId } : null;
    }
    case 'announcement':
      return { screen: 'Announcements' };
    case 'support_ticket': {
      const ticketId = asId(data.ticketId);
      return ticketId ? { screen: 'SupportTicket', ticketId } : null;
    }
    default:
      return null;
  }
}

type AppNavigationRef = NavigationContainerRefWithCurrent<
  StudentStackParamList & StaffStackParamList & ParentStackParamList
>;

function navigateToTarget(navigation: AppNavigationRef, role: UserRole, target: NotificationTarget) {
  switch (target.screen) {
    case 'PostDetail':
      navigation.navigate('PostDetail', { postId: target.postId });
      break;
    case 'ListingDetail':
      // У родителя нет раздела продажи работ.
      if (role !== 'parent') {
        navigation.navigate('ListingDetail', { listingId: target.listingId });
      }
      break;
    case 'Announcements':
      // «Сообщения» есть в стеке каждой роли.
      navigation.navigate('Messages');
      break;
    case 'SupportTicket':
      navigation.navigate('SupportTicket', { ticketId: target.ticketId });
      break;
  }
}

/**
 * Открывает нужный экран по нажатию на push-уведомление — и когда приложение
 * уже запущено, и когда оно было закрыто и запустилось из уведомления.
 *
 * Переход откладывается, пока навигация не готова и пользователь не вошёл:
 * нажатие, сделанное до входа, обработается сразу после него. Возвращает
 * функцию, которую нужно вызывать из onReady/onStateChange NavigationContainer.
 */
export function useNotificationNavigation(navigation: AppNavigationRef, role: UserRole | null) {
  const pending = useRef<NotificationTarget | null>(null);
  // ID уже обработанных уведомлений: при холодном старте то же нажатие может
  // прийти и через getLastNotificationResponse, и через слушатель.
  const handled = useRef(new Set<string>());
  const roleRef = useRef(role);
  roleRef.current = role;

  const flush = useCallback(() => {
    const target = pending.current;
    const currentRole = roleRef.current;
    if (!target || !currentRole || !navigation.isReady()) return;
    // Сразу после входа стек ученика/сотрудника/родителя может ещё не смонтироваться —
    // тогда ждём следующего onStateChange.
    const stack =
      isStaffRole(currentRole) ? 'StaffTabs' : currentRole === 'parent' ? 'ParentTabs' : 'StudentTabs';
    if (!navigation.getRootState()?.routeNames.includes(stack)) return;
    pending.current = null;
    navigateToTarget(navigation, currentRole, target);
  }, [navigation]);

  useEffect(() => {
    // На вебе push-уведомления Expo не используются.
    if (Platform.OS === 'web') return;

    const onResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const id = response.notification.request.identifier;
      if (handled.current.has(id)) return;
      handled.current.add(id);
      // Иначе после перезапуска приложения снова откроется тот же экран.
      Notifications.clearLastNotificationResponse();

      const target = resolveNotificationTarget(response.notification.request.content.data);
      if (!target) return;
      pending.current = target;
      flush();
    };

    onResponse(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => subscription.remove();
  }, [flush]);

  useEffect(() => {
    flush();
  }, [role, flush]);

  return flush;
}
