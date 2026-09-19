import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, spacing } from '../theme/colors';
import type { AnnouncementWithAuthor } from '../lib/announcements';

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'Всем',
  students: 'Ученикам',
  staff: 'Сотрудникам',
  group: 'Группе',
};

export function AnnouncementCard({ announcement }: { announcement: AnnouncementWithAuthor }) {
  return (
    <Card>
      <View style={styles.row}>
        {announcement.pinned ? <Text style={styles.pin}>📌</Text> : null}
        <Text style={styles.title}>{announcement.title}</Text>
      </View>
      <Text style={styles.body}>{announcement.body}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{announcement.author?.full_name ?? 'Администрация'}</Text>
        <Text style={styles.meta}>{AUDIENCE_LABELS[announcement.audience] ?? announcement.audience}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  pin: { fontSize: 14 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  body: { color: colors.text, lineHeight: 20, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.textMuted, fontSize: 12 },
});
