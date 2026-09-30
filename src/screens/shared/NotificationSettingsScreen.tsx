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
import { colors, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';

type SettingKey = 'notify_announcements' | 'notify_comments' | 'notify_moderation';

const SETTINGS: { key: SettingKey; title: string; description: string }[] = [
  {
    key: 'notify_announcements',
    title: 'Объявления',
    description: 'Новые объявления от администрации школы',
  },
  {
    key: 'notify_comments',
    title: 'Комментарии',
    description: 'Кто-то прокомментировал вашу работу в ленте',
  },
  {
    key: 'notify_moderation',
    title: 'Модерация',
    description: 'Решение по вашей публикации или объявлению о продаже',
  },
];

// null — статус ещё не известен или недоступен на этой платформе.
type PermissionState = { granted: boolean; canAskAgain: boolean } | null;

export function NotificationSettingsScreen() {
  const { profile, refreshProfile } = useAuth();
  const [values, setValues] = useState<Pick<Profile, SettingKey> | null>(
    profile
      ? {
          notify_announcements: profile.notify_announcements,
          notify_comments: profile.notify_comments,
          notify_moderation: profile.notify_moderation,
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
      Alert.alert('Не удалось сохранить', error.message);
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
          <Text style={styles.warningTitle}>Уведомления выключены на устройстве</Text>
          <Text style={styles.warningText}>
            {permission.canAskAgain
              ? 'Разрешите приложению присылать уведомления, чтобы получать их.'
              : 'Включите уведомления для приложения в системных настройках телефона.'}
          </Text>
          <Button
            title={permission.canAskAgain ? 'Разрешить уведомления' : 'Открыть настройки'}
            onPress={enablePush}
          />
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Присылать уведомления</Text>
      <Card style={styles.list}>
        {SETTINGS.map((setting, index) => (
          <View key={setting.key} style={[styles.row, index > 0 && styles.rowDivider]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{setting.title}</Text>
              <Text style={styles.rowDescription}>{setting.description}</Text>
            </View>
            <Switch
              value={values[setting.key]}
              onValueChange={(value) => toggle(setting.key, value)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={values[setting.key] ? colors.primary : colors.white}
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
