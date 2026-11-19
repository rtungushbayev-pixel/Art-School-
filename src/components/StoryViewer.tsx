import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from './Avatar';
import { deleteStory, markStorySeen, type StoryGroup } from '../lib/stories';
import { errorText } from '../lib/errors';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';

const STORY_MS = 5000;

const STRINGS = {
  ru: {
    pending: 'На проверке. Сторис увидят все, когда проверка пройдёт.',
    rejected: 'Сторис не прошла проверку и видна только вам.',
    views: (n: number) => `Просмотров: ${n}`,
    delete: 'Удалить',
    deleteQ: 'Удалить сторис?',
    cancel: 'Отмена',
    failed: 'Не получилось',
    hoursAgo: (h: number) => (h < 1 ? 'только что' : `${h} ч назад`),
  },
  kk: {
    pending: 'Тексерілуде. Тексеруден өткен соң оқиғаны бәрі көреді.',
    rejected: 'Оқиға тексеруден өтпеді, оны тек сіз көресіз.',
    views: (n: number) => `Қаралым: ${n}`,
    delete: 'Жою',
    deleteQ: 'Оқиғаны жою керек пе?',
    cancel: 'Бас тарту',
    failed: 'Болмады',
    hoursAgo: (h: number) => (h < 1 ? 'жаңа ғана' : `${h} сағ бұрын`),
  },
  en: {
    pending: 'Under review. Everyone will see the story once it passes.',
    rejected: 'This story did not pass review and only you can see it.',
    views: (n: number) => `Views: ${n}`,
    delete: 'Delete',
    deleteQ: 'Delete this story?',
    cancel: 'Cancel',
    failed: 'Failed',
    hoursAgo: (h: number) => (h < 1 ? 'just now' : `${h} h ago`),
  },
};

interface Props {
  groups: StoryGroup[];
  startIndex: number | null;
  viewerId: string;
  onClose: () => void;
  onDeleted: () => void;
}

// Полноэкранный просмотр сторис: полоски сверху, касание справа — дальше,
// слева — назад, удержание — пауза. После последней сторис человека — следующий.
export function StoryViewer({ groups, startIndex, viewerId, onClose, onDeleted }: Props) {
  const s = useStrings(STRINGS);
  const insets = useSafeAreaInsets();
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const visible = startIndex !== null;
  const group = visible ? groups[groupIndex] : undefined;
  const story = group?.stories[storyIndex];
  const own = !!story && story.author_id === viewerId;

  // Открыли — с первой непросмотренной сторис этого человека.
  useEffect(() => {
    if (startIndex === null) return;
    const g = groups[startIndex];
    const firstNew = g ? g.stories.findIndex((st) => !st.seen) : -1;
    setGroupIndex(startIndex);
    setStoryIndex(firstNew >= 0 ? firstNew : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex]);

  const next = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) setStoryIndex(storyIndex + 1);
    else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else onClose();
  };

  const prev = () => {
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
    else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  };

  useEffect(() => {
    if (!story) return;
    if (!own && !story.seen) {
      story.seen = true;
      markStorySeen(story.id).catch(() => {});
    }
    progress.setValue(0);
  }, [story, own, progress]);

  useEffect(() => {
    if (!story || paused) return;
    let animation: Animated.CompositeAnimation | undefined;
    // После паузы досчитываем остаток времени, а не начинаем заново.
    progress.stopAnimation((value) => {
      animation = Animated.timing(progress, {
        toValue: 1,
        duration: STORY_MS * (1 - value),
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animation.start(({ finished }) => {
        if (finished) next();
      });
    });
    return () => animation?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, paused]);

  const remove = () => {
    if (!story) return;
    setPaused(true);
    Alert.alert(s.deleteQ, undefined, [
      { text: s.cancel, style: 'cancel', onPress: () => setPaused(false) },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStory(story);
            onClose();
            onDeleted();
          } catch (e) {
            setPaused(false);
            Alert.alert(s.failed, errorText(e));
          }
        },
      },
    ]);
  };

  const hours = story ? Math.floor((Date.now() - Date.parse(story.created_at)) / 3600000) : 0;

  return (
    <Modal visible={visible && !!story} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {group && story ? (
        <View style={styles.root}>
          <Image source={{ uri: story.image_url }} style={StyleSheet.absoluteFill} contentFit="contain" />

          <View style={styles.tapZones}>
            <Pressable
              style={styles.tapZone}
              onPress={prev}
              onLongPress={() => setPaused(true)}
              onPressOut={() => setPaused(false)}
            />
            <Pressable
              style={[styles.tapZone, { flex: 2 }]}
              onPress={next}
              onLongPress={() => setPaused(true)}
              onPressOut={() => setPaused(false)}
            />
          </View>

          <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
            <View style={styles.bars}>
              {group.stories.map((st, i) => (
                <View key={st.id} style={styles.bar}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        width:
                          i < storyIndex
                            ? '100%'
                            : i === storyIndex
                              ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                              : '0%',
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.header}>
              <Avatar uri={group.author.avatar_url} name={group.author.full_name} size={34} />
              <Text style={styles.name} numberOfLines={1}>
                {group.author.full_name}
              </Text>
              <Text style={styles.time}>{s.hoursAgo(hours)}</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
                <Ionicons name="close" size={30} color={colors.white} />
              </Pressable>
            </View>
          </View>

          {own ? (
            <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
              {story.status !== 'approved' ? (
                <Text style={styles.notice}>
                  {story.status === 'pending' ? s.pending : `${s.rejected}${story.ai_reason ? `\n${story.ai_reason}` : ''}`}
                </Text>
              ) : null}
              <View style={styles.ownRow}>
                <View style={styles.views}>
                  <Ionicons name="eye-outline" size={20} color={colors.white} />
                  <Text style={styles.viewsText}>{s.views(story.viewCount)}</Text>
                </View>
                <Pressable onPress={remove} hitSlop={10} style={styles.views}>
                  <Ionicons name="trash-outline" size={20} color={colors.white} />
                  <Text style={styles.viewsText}>{s.delete}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  tapZone: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: spacing.sm },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  name: { color: colors.white, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  time: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  close: { marginLeft: 'auto' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md },
  notice: {
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 19,
  },
  ownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  views: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewsText: { color: colors.white, fontWeight: '600' },
});
