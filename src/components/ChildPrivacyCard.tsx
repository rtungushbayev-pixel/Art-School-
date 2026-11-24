import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { useStrings } from '../i18n';
import { supabase } from '../lib/supabase';
import type { PostsVisibility } from '../types/database';
import { colors, spacing } from '../theme/colors';

const STRINGS = {
  ru: {
    title: 'Приватность ребёнка',
    hint: 'Кто видит публикации и сторис ребёнка. Вы и сотрудники школы видите их всегда.',
    whoSees: 'Кто видит публикации',
    visibility: { all: 'Все', friends: 'Только друзья', nobody: 'Скрыть от всех' } as Record<PostsVisibility, string>,
    storiesFriends: 'Сторис только от друзей',
    storiesFriendsHint: 'Над лентой ребёнку показываются сторис только его друзей',
    saveFailed: 'Не удалось сохранить',
  },
  kk: {
    title: 'Баланың құпиялылығы',
    hint: 'Баланың жарияланымдары мен оқиғаларын кім көреді. Сіз және мектеп қызметкерлері әрқашан көресіз.',
    whoSees: 'Жарияланымдарды кім көреді',
    visibility: { all: 'Барлығы', friends: 'Тек достар', nobody: 'Ешкімге көрсетпеу' } as Record<PostsVisibility, string>,
    storiesFriends: 'Оқиғалар тек достардан',
    storiesFriendsHint: 'Лента үстінде балаға тек достарының оқиғалары көрсетіледі',
    saveFailed: 'Сақтау мүмкін болмады',
  },
  en: {
    title: 'Child’s privacy',
    hint: 'Who can see your child’s posts and stories. You and school staff always can.',
    whoSees: 'Who can see posts',
    visibility: { all: 'Everyone', friends: 'Friends only', nobody: 'Hide from everyone' } as Record<PostsVisibility, string>,
    storiesFriends: 'Stories from friends only',
    storiesFriendsHint: 'Your child sees only friends’ stories above the feed',
    saveFailed: 'Could not save',
  },
};

// Родитель видит и меняет настройки приватности своего ребёнка (миграция 0059,
// функция set_child_privacy проверяет, что это действительно его ребёнок).
export function ChildPrivacyCard({
  childId,
  visibility: initialVisibility,
  storiesFriendsOnly,
}: {
  childId: string;
  visibility: PostsVisibility;
  storiesFriendsOnly: boolean;
}) {
  const s = useStrings(STRINGS);
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<PostsVisibility>(initialVisibility);
  const [storiesFriends, setStoriesFriends] = useState(storiesFriendsOnly);

  // Ребёнок мог поменять настройки сам — показываем свежие после обновления экрана.
  useEffect(() => setVisibility(initialVisibility), [initialVisibility]);
  useEffect(() => setStoriesFriends(storiesFriendsOnly), [storiesFriendsOnly]);

  const save = async (next: { visibility: PostsVisibility; storiesFriends: boolean }, undo: () => void) => {
    const { error } = await supabase.rpc('set_child_privacy', {
      p_child: childId,
      p_posts_visibility: next.visibility,
      p_stories_friends_only: next.storiesFriends,
    });
    if (error) {
      undo();
      Alert.alert(s.saveFailed, error.message);
    }
  };

  const chooseVisibility = (value: PostsVisibility) => {
    const previous = visibility;
    setVisibility(value);
    save({ visibility: value, storiesFriends }, () => setVisibility(previous));
  };

  const toggleStories = (value: boolean) => {
    setStoriesFriends(value);
    save({ visibility, storiesFriends: value }, () => setStoriesFriends(!value));
  };

  return (
    <Card style={styles.card}>
      <Pressable style={styles.head} onPress={() => setOpen((v) => !v)}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
        <View style={styles.text}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.hint}>{s.visibility[visibility]}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <>
          <Text style={[styles.hint, styles.topGap]}>{s.hint}</Text>
          <Text style={[styles.title, styles.topGap]}>{s.whoSees}</Text>
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
          <View style={styles.switchRow}>
            <View style={styles.text}>
              <Text style={styles.title}>{s.storiesFriends}</Text>
              <Text style={styles.hint}>{s.storiesFriendsHint}</Text>
            </View>
            <Switch
              value={storiesFriends}
              onValueChange={toggleStories}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  topGap: { marginTop: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  optionText: { fontSize: 16, color: colors.text },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
