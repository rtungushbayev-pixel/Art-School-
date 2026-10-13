import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    editProfile: 'Редактировать профиль',
    editHint: 'Имя, фото, телефон, о себе',
    notifications: 'Уведомления',
    notificationsHint: 'Какие уведомления присылать',
    language: 'Язык приложения',
  },
  kk: {
    editProfile: 'Профильді өңдеу',
    editHint: 'Аты, фото, телефон, өзі туралы',
    notifications: 'Хабарландырулар',
    notificationsHint: 'Қандай хабарландырулар жіберу керек',
    language: 'Қолданба тілі',
  },
  en: {
    editProfile: 'Edit profile',
    editHint: 'Name, photo, phone, about you',
    notifications: 'Notifications',
    notificationsHint: 'Which notifications to send',
    language: 'App language',
  },
};

// «Настройки профиля»: редактирование профиля, уведомления и язык в одном месте.
export function ProfileSettingsScreen() {
  // Экран есть в стеке каждой роли, у которой есть профиль.
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);

  const row = (icon: keyof typeof Ionicons.glyphMap, title: string, hint: string, onPress: () => void, divider = false) => (
    <Pressable onPress={onPress} style={[styles.row, divider && styles.divider]}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Screen scroll>
      <Card style={styles.list}>
        {row('person-outline', s.editProfile, s.editHint, () => navigation.navigate('EditProfile'))}
        {row(
          'notifications-outline',
          s.notifications,
          s.notificationsHint,
          () => navigation.navigate('NotificationSettings'),
          true
        )}
      </Card>
      <Text style={styles.sectionLabel}>{s.language}</Text>
      <LanguageSwitcher />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
