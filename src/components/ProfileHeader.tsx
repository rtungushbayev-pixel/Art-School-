import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { colors, radius, spacing } from '../theme/colors';
import type { EnrollmentStatus, Profile, UserRole } from '../types/database';

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Ученик',
  staff: 'Сотрудник школы',
  parent: 'Родитель',
};

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  planning: 'Планирует поступать',
  applied: 'Подал документы',
  enrolled: 'Поступил(а)',
};

interface ProfileHeaderProps {
  profile: Profile;
  // Группы (студии) ученика — показываются пилюлями под описанием
  groups?: { id: string; name: string }[];
  // Свой профиль: нажатие на аватар меняет фото
  onAvatarPress?: () => void;
  avatarUploading?: boolean;
}

export function ProfileHeader({ profile, groups, onAvatarPress, avatarUploading }: ProfileHeaderProps) {
  const studyLine = [
    profile.specialization,
    profile.study_since ? `в школе с ${profile.study_since} года` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.wrapper}>
      {onAvatarPress ? (
        <Pressable onPress={onAvatarPress} disabled={avatarUploading} accessibilityLabel="Изменить фото">
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={84} />
          <View style={styles.cameraBadge}>
            {avatarUploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="camera" size={16} color={colors.white} />
            )}
          </View>
        </Pressable>
      ) : (
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={84} />
      )}
      <Text style={styles.name}>{profile.full_name || 'Без имени'}</Text>
      <Text style={styles.role}>{ROLE_LABELS[profile.role]}</Text>
      {studyLine ? <Text style={styles.study}>{studyLine}</Text> : null}
      {groups && groups.length > 0 ? (
        <View style={styles.groups}>
          {groups.map((group) => (
            <View key={group.id} style={styles.groupPill}>
              <Text style={styles.groupText}>{group.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  wrapper: { alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  role: { color: colors.textMuted, marginTop: 2 },
  study: { color: colors.primary, fontWeight: '600', marginTop: spacing.xs, textAlign: 'center' },
  groups: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
  groupPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  groupText: { fontSize: 12, fontWeight: '600', color: colors.text },
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
