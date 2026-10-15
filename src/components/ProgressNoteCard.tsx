import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { colors, spacing } from '../theme/colors';
import type { ProgressNoteWithAuthor } from '../lib/parents';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: { locale: 'ru-RU', delete: 'Удалить' },
  kk: { locale: 'kk-KZ', delete: 'Жою' },
  en: { locale: 'en-GB', delete: 'Delete' },
};

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={size} color={colors.accent} />
      ))}
    </View>
  );
}

export function ProgressNoteCard({
  note,
  onDelete,
}: {
  note: ProgressNoteWithAuthor;
  onDelete?: () => void;
}) {
  const s = useStrings(STRINGS);
  const date = new Date(note.created_at).toLocaleDateString(s.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>{note.title}</Text>
        {note.rating ? <RatingStars rating={note.rating} /> : null}
      </View>
      {note.body ? <Text style={styles.body}>{note.body}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.meta}>
          {note.author?.full_name ? `${note.author.full_name} · ` : ''}
          {date}
        </Text>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={styles.delete}>{s.delete}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  stars: { flexDirection: 'row', gap: 1 },
  body: { color: colors.text, marginTop: spacing.xs, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 12 },
  delete: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
