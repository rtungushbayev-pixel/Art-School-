import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { PostCardData } from './PostCard';
import { useStrings } from '../i18n';
import { colors, radius, shadow, spacing } from '../theme/colors';

const STRINGS = {
  ru: { title: 'Было — стало', before: 'Было', after: 'Стало', hint: 'Первая и последняя работа рядом: видно, как ты растёшь.' },
  kk: { title: 'Болған — болды', before: 'Болған', after: 'Қазір', hint: 'Алғашқы және соңғы жұмыс қатар: қалай өсіп келе жатқаның көрінеді.' },
  en: { title: 'Then and now', before: 'Then', after: 'Now', hint: 'Your first and latest work side by side: see how you grow.' },
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// Первая и последняя работа ученика рядом. Нужны хотя бы две работы с фото,
// отклонённые модерацией не берём.
export function pickBeforeAfter(posts: PostCardData[]): [PostCardData, PostCardData] | null {
  const withPhoto = posts
    .filter((p) => p.status !== 'rejected' && p.images.length > 0)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (withPhoto.length < 2) return null;
  return [withPhoto[0], withPhoto[withPhoto.length - 1]];
}

export function BeforeAfter({ posts, onOpenPost }: { posts: PostCardData[]; onOpenPost: (postId: string) => void }) {
  const s = useStrings(STRINGS);
  const pair = pickBeforeAfter(posts);
  if (!pair) return null;
  const [first, last] = pair;

  const tile = (post: PostCardData, label: string, accent: string) => (
    <Pressable style={styles.tile} onPress={() => onOpenPost(post.id)}>
      <View style={[styles.frame, { borderColor: accent }]}>
        <Image source={{ uri: post.images[0].image_url }} style={styles.image} contentFit="cover" transition={150} />
        <View style={[styles.label, { backgroundColor: accent }]}>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      </View>
      <Text style={styles.date}>{shortDate(post.created_at)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{s.title}</Text>
      <View style={styles.row}>
        {tile(first, s.before, '#36BFF0')}
        <Ionicons name="arrow-forward" size={22} color={colors.primary} style={styles.arrow} />
        {tile(last, s.after, '#EF457A')}
      </View>
      <Text style={styles.hint}>{s.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  tile: { flex: 1 },
  frame: { borderWidth: 3, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, ...shadow.soft },
  image: { width: '100%', aspectRatio: 1 },
  label: { position: 'absolute', top: 6, left: 6, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  labelText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  arrow: { marginHorizontal: spacing.xs },
  date: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
