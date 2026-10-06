import React, { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { syncPushToken } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';

type SettingKey = 'notify_announcements' | 'notify_comments' | 'notify_moderation' | 'notify_support' | 'notify_attendance';

const SETTING_KEYS: SettingKey[] = [
  'notify_attendance',
  'notify_announcements',
  'notify_comments',
  'notify_moderation',
  'notify_support',
];

type SettingText = Record<SettingKey, { title: string; description: string }>;

const STRINGS = {
  ru: {
    settings: {
      notify_attendance: {
        title: 'Посещаемость',
        description: 'Ребёнок отсутствует на занятии',
      },
      notify_announcements: {
        title: 'Объявления',
        description: 'Новые объявления от администрации школы',
      },
      notify_comments: {
        title: 'Комментарии',
        description: 'Кто-то прокомментировал вашу работу в ленте',
      },
      notify_moderation: {
        title: 'Модерация',
        description: 'Решение по вашей публикации или объявлению о продаже',
      },
      notify_support: {
        title: 'Помощь',
        description: 'Ответ сотрудника на ваше обращение (сотрудникам — новые обращения)',
      },
    } as SettingText,
    saveFailed: 'Не удалось сохранить',
    disabledTitle: 'Уведомления выключены на устройстве',
    allowText: 'Разрешите приложению присылать уведомления, чтобы получать их.',
    settingsText: 'Включите уведомления для приложения в системных настройках телефона.',
    allow: 'Разрешить уведомления',
    openSettings: 'Открыть настройки',
    sendNotifications: 'Присылать уведомления',
  },
  kk: {
    settings: {
      notify_attendance: {
        title: 'Сабаққа қатысу',
        description: 'Бала сабаққа келмеді',
      },
      notify_announcements: {
        title: 'Хабарландырулар',
        description: 'Мектеп әкімшілігінің жаңа хабарландырулары',
      },
      notify_comments: {
        title: 'Пікірлер',
        description: 'Біреу таспадағы жұмысыңызға пікір қалдырды',
      },
      notify_moderation: {
        title: 'Модерация',
        description: 'Жарияланымыңыз немесе сату туралы хабарландыруыңыз бойынша шешім',
      },
      notify_support: {
        title: 'Көмек',
        description: 'Қызметкердің өтінішіңізге жауабы (қызметкерлерге — жаңа өтініштер)',
      },
    } as SettingText,
    saveFailed: 'Сақтау мүмкін болмады',
    disabledTitle: 'Құрылғыда хабарландырулар өшірулі',
    allowText: 'Хабарландыруларды алу үшін қолданбаға оларды жіберуге рұқсат беріңіз.',
    settingsText: 'Телефонның жүйелік баптауларында қолданбаға хабарландыруларды қосыңыз.',
    allow: 'Хабарландыруларға рұқсат беру',
    openSettings: 'Баптауларды ашу',
    sendNotifications: 'Хабарландыру жіберу',
  },
  en: {
    settings: {
      notify_attendance: {
        title: 'Attendance',
        description: 'Your child is absent from a class',
      },
      notify_announcements: {
        title: 'Announcements',
        description: 'New announcements from the school administration',
      },
      notify_comments: {
        title: 'Comments',
        description: 'Someone commented on your work in the feed',
      },
      notify_moderation: {
        title: 'Moderation',
        description: 'A decision on your post or sale listing',
      },
      notify_support: {
        title: 'Help',
        description: 'A staff reply to your request (for staff — new requests)',
      },
    } as SettingText,
    saveFailed: 'Could not save',
    disabledTitle: 'Notifications are turned off on this device',
    allowText: 'Allow the app to send notifications to receive them.',
    settingsText: 'Turn on notifications for the app in your phone’s system settings.',
    allow: 'Allow notifications',
    openSettings: 'Open settings',
    sendNotifications: 'Send me notifications',
  },
};

// null — статус ещё не известен или недоступен на этой платформе.
type PermissionState = { granted: boolean; canAskAgain: boolean } | null;

export function NotificationSettingsScreen() {
  const { profile, refreshProfile } = useAuth();
  const s = useStrings(STRINGS);
  const [values, setValues] = useState<Pick<Profile, SettingKey> | null>(
    profile
      ? {
          notify_announcements: profile.notify_announcements,
          notify_comments: profile.notify_comments,
          notify_moderation: profile.notify_moderation,
          notify_support: profile.notify_support,
          notify_attendance: profile.notify_attendance ?? true,
        }
      : null
  );
  const [permission, setPermission] = useState<PermissionState>(null);

  const loadPermission = useCallback(async () => {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      setPermission({ granted: status === 'granted', canAskAgain });
    } catch {
      setPermission(null);
    }
  }, []);

  // Пользователь мог включить уведомления в системных настройках и вернуться.
  useFocusEffect(
    useCallback(() => {
      loadPermission();
    }, [loadPermission])
  );

  if (!profile || !values) return null;

  const toggle = async (key: SettingKey, value: boolean) => {
    // Функциональные обновления: быстрые переключения разных пунктов подряд
    // не должны затирать друг друга.
    setValues((prev) => prev && { ...prev, [key]: value });
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('id', profile.id);
    if (error) {
      setValues((prev) => prev && { ...prev, [key]: !value });
      Alert.alert(s.saveFailed, error.message);
      return;
    }
    refreshProfile();
  };

  const enablePush = async () => {
    if (permission && !permission.canAskAgain) {
      Linking.openSettings();
      return;
    }
    // Запрашивает разрешение и регистрирует push-токен устройства.
    await syncPushToken();
    await loadPermission();
    refreshProfile();
  };

  return (
    <Screen scroll>
      {permission && !permission.granted ? (
        <Card style={styles.warning}>
          <Text style={styles.warningTitle}>{s.disabledTitle}</Text>
          <Text style={styles.warningText}>
            {permission.canAskAgain
              ? s.allowText
              : s.settingsText}
          </Text>
          <Button
            title={permission.canAskAgain ? s.allow : s.openSettings}
            onPress={enablePush}
          />
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>{s.sendNotifications}</Text>
      <Card style={styles.list}>
        {SETTING_KEYS.filter((key) => key !== 'notify_attendance' || profile.role === 'parent').map((key, index) => (
          <View key={key} style={[styles.row, index > 0 && styles.rowDivider]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{s.settings[key].title}</Text>
              <Text style={styles.rowDescription}>{s.settings[key].description}</Text>
            </View>
            <Switch
              value={values[key]}
              onValueChange={(value) => toggle(key, value)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={values[key] ? colors.primary : colors.white}
              ios_backgroundColor={colors.border}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: { borderColor: colors.warning, gap: spacing.sm },
  warningTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  warningText: { color: colors.textMuted, marginBottom: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowDescription: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
