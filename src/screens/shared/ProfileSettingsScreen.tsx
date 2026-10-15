import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useStrings } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { PostsVisibility } from '../../types/database';
import { colors, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    editProfile: 'Редактировать профиль',
    editHint: 'Имя, фото, телефон, о себе',
    notifications: 'Уведомления',
    notificationsHint: 'Какие уведомления присылать',
    language: 'Язык приложения',
    privacy: 'Приватность',
    whoSees: 'Кто видит мои публикации',
    whoSeesHint: 'Публикации и сторис. Сотрудники школы и ваши родители видят всегда.',
    visibility: { all: 'Все', friends: 'Только друзья', nobody: 'Скрыть от всех' } as Record<PostsVisibility, string>,
    storiesFriends: 'Сторис только от друзей',
    storiesFriendsHint: 'Над лентой показывать сторис только ваших друзей',
    saveFailed: 'Не удалось сохранить',
  },
  kk: {
    editProfile: 'Профильді өңдеу',
    editHint: 'Аты, фото, телефон, өзі туралы',
    notifications: 'Хабарландырулар',
    notificationsHint: 'Қандай хабарландырулар жіберу керек',
    language: 'Қолданба тілі',
    privacy: 'Құпиялылық',
    whoSees: 'Жарияланымдарымды кім көреді',
    whoSeesHint: 'Жарияланымдар мен оқиғалар. Мектеп қызметкерлері мен ата-анаңыз әрқашан көреді.',
    visibility: { all: 'Барлығы', friends: 'Тек достар', nobody: 'Ешкімге көрсетпеу' } as Record<PostsVisibility, string>,
    storiesFriends: 'Оқиғалар тек достардан',
    storiesFriendsHint: 'Лента үстінде тек достарыңыздың оқиғаларын көрсету',
    saveFailed: 'Сақтау мүмкін болмады',
  },
  en: {
    editProfile: 'Edit profile',
    editHint: 'Name, photo, phone, about you',
    notifications: 'Notifications',
    notificationsHint: 'Which notifications to send',
    language: 'App language',
    privacy: 'Privacy',
    whoSees: 'Who can see my posts',
    whoSeesHint: 'Posts and stories. School staff and your parents can always see them.',
    visibility: { all: 'Everyone', friends: 'Friends only', nobody: 'Hide from everyone' } as Record<PostsVisibility, string>,
    storiesFriends: 'Stories from friends only',
    storiesFriendsHint: 'Show only your friends’ stories above the feed',
    saveFailed: 'Could not save',
  },
};

// «Настройки профиля»: редактирование профиля, уведомления и язык в одном месте.
export function ProfileSettingsScreen() {
  // Экран есть в стеке каждой роли, у которой есть профиль.
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);
  const { profile, refreshProfile } = useAuth();
  const isStudent = profile?.role === 'student';
  const [visibility, setVisibility] = useState<PostsVisibility>(profile?.posts_visibility ?? 'all');
  const [storiesFriends, setStoriesFriends] = useState(!!profile?.stories_friends_only);

  // Сохраняем сразу; при ошибке возвращаем как было.
  const save = async (patch: { posts_visibility?: PostsVisibility; stories_friends_only?: boolean }, undo: () => void) => {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', profile.id);
    if (error) {
      undo();
      Alert.alert(s.saveFailed, error.message);
      return;
    }
    refreshProfile();
  };

  const chooseVisibility = (value: PostsVisibility) => {
    const previous = visibility;
    setVisibility(value);
    save({ posts_visibility: value }, () => setVisibility(previous));
  };

  const toggleStoriesFriends = (value: boolean) => {
    setStoriesFriends(value);
    save({ stories_friends_only: value }, () => setStoriesFriends(!value));
  };

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
      {isStudent ? (
        <>
          <Text style={styles.sectionLabel}>{s.privacy}</Text>
          <Card>
            <Text style={styles.title}>{s.whoSees}</Text>
            <Text style={styles.hint}>{s.whoSeesHint}</Text>
            <View style={styles.options}>
              {(['all', 'friends', 'nobody'] as PostsVisibility[]).map((value) => (
                <Pressable key={value} style={styles.option} onPress={() => chooseVisibility(value)}>
                  <Ionicons
                    name={visibility === value ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={visibility === value ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.optionText}>{s.visibility[value]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.switchRow, styles.divider]}>
              <View style={styles.text}>
                <Text style={styles.title}>{s.storiesFriends}</Text>
                <Text style={styles.hint}>{s.storiesFriendsHint}</Text>
              </View>
              <Switch
                value={storiesFriends}
                onValueChange={toggleStoriesFriends}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
          </Card>
        </>
      ) : null}
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
  options: { marginTop: spacing.sm, marginBottom: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  optionText: { fontSize: 16, color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
