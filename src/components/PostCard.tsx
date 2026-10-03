import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { PhotoCarousel } from './PhotoCarousel';
import { useStrings, type Lang, useLanguage } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';

export interface PostCardData {
  id: string;
  caption: string | null;
  title: string | null;
  technique: string | null;
  artwork_year: number | null;
  featured: boolean;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  author: { id: string; full_name: string; avatar_url: string | null } | null;
  images: { id: string; image_url: string }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

interface PostCardProps {
  post: PostCardData;
  onPress?: () => void;
  onToggleLike?: () => void;
  onAuthorPress?: () => void;
  showModerationBadge?: boolean;
  // Аватар того, кто смотрит, — у строки «Написать комментарий»
  viewer?: { full_name: string; avatar_url: string | null } | null;
}

const STRINGS = {
  ru: {
    student: 'Ученик',
    pending: 'На проверке',
    rejected: 'Отклонено',
    openPost: 'Открыть публикацию',
    openAuthor: 'Профиль автора',
    writeComment: 'Написать комментарий',
  },
  kk: {
    student: 'Оқушы',
    pending: 'Тексерілуде',
    rejected: 'Қабылданбады',
    openPost: 'Жарияланымды ашу',
    openAuthor: 'Автордың профилі',
    writeComment: 'Пікір жазу',
  },
  en: {
    student: 'Student',
    pending: 'Under review',
    rejected: 'Rejected',
    openPost: 'Open post',
    openAuthor: 'Author profile',
    writeComment: 'Write a comment',
  },
};

const MONTHS_SHORT: Record<Lang, string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  kk: ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

// Сегодня — только время, раньше — дата.
function formatPostTime(iso: string, lang: Lang): string {
  const date = new Date(iso);
  const now = new Date();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (date.toDateString() === now.toDateString()) return time;
  const month = MONTHS_SHORT[lang][date.getMonth()];
  const day = lang === 'en' ? `${month} ${date.getDate()}` : `${date.getDate()} ${month}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

// Публикация в стиле соцсети: фото на всю ширину экрана, под ним реакции,
// подпись автора и приглашение оставить комментарий.
export function PostCard({ post, onPress, onToggleLike, onAuthorPress, showModerationBadge, viewer }: PostCardProps) {
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const meta = [post.title, post.technique, formatPostTime(post.created_at, lang)].filter(Boolean).join(' • ');

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Pressable onPress={onAuthorPress} style={styles.author}>
          <Avatar uri={post.author?.avatar_url} name={post.author?.full_name} size={44} />
          <View style={styles.authorText}>
            <Text style={styles.authorName} numberOfLines={1}>
              {post.author?.full_name ?? s.student}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        </Pressable>
        {showModerationBadge && post.status !== 'approved' ? (
          <View style={[styles.badge, post.status === 'pending' ? styles.badgePending : styles.badgeRejected]}>
            <Text style={styles.badgeText}>{post.status === 'pending' ? s.pending : s.rejected}</Text>
          </View>
        ) : null}
        <Pressable onPress={onAuthorPress ?? onPress} hitSlop={10} accessibilityLabel={s.openAuthor}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      </View>

      <PhotoCarousel images={post.images} onPress={onPress} />

      <View style={styles.actions}>
        <Pressable onPress={onToggleLike} style={styles.action} hitSlop={6}>
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={28}
            color={post.likedByMe ? colors.danger : colors.text}
          />
          <Text style={styles.actionCount}>{post.likeCount}</Text>
        </Pressable>
        <Pressable onPress={onPress} style={styles.action} hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
          <Text style={styles.actionCount}>{post.commentCount}</Text>
        </Pressable>
      </View>

      {post.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.captionAuthor}>{post.author?.full_name ?? s.student} </Text>
          {post.caption}
        </Text>
      ) : null}

      <Pressable onPress={onPress} style={styles.commentRow}>
        <Avatar uri={viewer?.avatar_url} name={viewer?.full_name} size={30} />
        <Text style={styles.commentPlaceholder}>{s.writeComment}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Публикация на всю ширину экрана, поверх отступов Screen.
  wrapper: { marginHorizontal: -spacing.md, marginBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authorText: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  badgePending: { backgroundColor: colors.accent },
  badgeRejected: { backgroundColor: colors.danger },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  actions: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 16, color: colors.text },
  caption: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, color: colors.text, fontSize: 15 },
  captionAuthor: { fontWeight: '700' },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
  },
  commentPlaceholder: { color: colors.textMuted, fontSize: 15 },
});
