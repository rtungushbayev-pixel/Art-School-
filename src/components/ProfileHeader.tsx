import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors, radius, spacing } from '../theme/colors';
import type { EnrollmentStatus, Profile } from '../types/database';

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  planning: 'Планирует поступать',
  applied: 'Подал документы',
  enrolled: 'Поступил(а)',
};

export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <View style={styles.wrapper}>
      <Avatar uri={profile.avatar_url} name={profile.full_name} size={84} />
      <Text style={styles.name}>{profile.full_name || 'Без имени'}</Text>
      <Text style={styles.role}>{profile.role === 'staff' ? 'Сотрудник школы' : 'Ученик'}</Text>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {profile.target_institution ? (
        <View style={styles.institutionBadge}>
          <Text style={styles.institutionStatus}>
            {profile.target_institution_status ? STATUS_LABELS[profile.target_institution_status] : 'Цель'}
          </Text>
          <Text style={styles.institutionName}>{profile.target_institution}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  role: { color: colors.textMuted, marginTop: 2 },
  bio: { color: colors.text, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  institutionBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  institutionStatus: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
  institutionName: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
});
