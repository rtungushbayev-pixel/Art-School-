import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, paint, radius, spacing } from '../theme/colors';
import type { AnnouncementAudience } from '../types/database';
import type { AnnouncementWithAuthor } from '../lib/announcements';

const AUDIENCE: Record<AnnouncementAudience, { label: string; color: string }> = {
  all: { label: 'Всем', color: paint.coral },
  students: { label: 'Ученикам', color: paint.teal },
  staff: { label: 'Сотрудникам', color: paint.violet },
  group: { label: 'Группе', color: paint.ochre },
};

interface AnnouncementCardProps {
  announcement: AnnouncementWithAuthor;
  editable?: boolean;
}

export function AnnouncementCard({ announcement, editable }: AnnouncementCardProps) {
  const audience = AUDIENCE[announcement.audience];
  return (
    <Card>
      <View style={styles.row}>
        {announcement.pinned ? <Text style={styles.pin}>📌</Text> : null}
        <Text style={styles.title}>{announcement.title}</Text>
        {editable ? <Text style={styles.editIcon}>✏️</Text> : null}
      </View>
      <Text style={styles.body}>{announcement.body}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{announcement.author?.full_name ?? 'Администрация'}</Text>
        <View style={[styles.audienceTag, { backgroundColor: audience.color }]}>
          <Text style={styles.audienceText}>{audience.label}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  pin: { fontSize: 14 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  editIcon: { fontSize: 14, marginLeft: spacing.xs },
  body: { color: colors.text, lineHeight: 20, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: colors.textMuted, fontSize: 12 },
  audienceTag: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  audienceText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
