import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Avatar } from './Avatar';
import { colorFromSeed, colors, radius, shadow, spacing } from '../theme/colors';
import type { EnrollmentStatus, Profile, UserRole } from '../types/database';

const AVATAR_SIZE = 168;

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

  // Мягкое свечение за аватаром: у каждого свой оттенок «краски» по имени.
  // Бледное и уходит в фон экрана, поэтому не спорит с фото на аватаре,
  // а белая рамка отделяет снимок от фона.
  const glow = colorFromSeed(profile.full_name?.trim() || profile.id);
  const subtitle = [ROLE_LABELS[profile.role], ...(groups ?? []).map((g) => g.name)].join(' · ');

  const avatar = (
    <View style={styles.avatarRing}>
      <Avatar uri={profile.avatar_url} name={profile.full_name} size={AVATAR_SIZE} />
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.hero}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="55%" rx="60%" ry="55%">
              <Stop offset="0" stopColor={glow} stopOpacity={0.38} />
              <Stop offset="0.55" stopColor={glow} stopOpacity={0.14} />
              <Stop offset="1" stopColor={colors.background} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
        </Svg>
        <Text style={styles.name}>{profile.full_name || 'Без имени'}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      {onAvatarPress ? (
        <Pressable onPress={onAvatarPress} disabled={avatarUploading} accessibilityLabel="Изменить фото">
          {avatar}
          <View style={styles.cameraBadge}>
            {avatarUploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="camera" size={20} color={colors.white} />
            )}
          </View>
        </Pressable>
      ) : (
        avatar
      )}
      </View>
      {studyLine ? <Text style={styles.study}>{studyLine}</Text> : null}
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {profile.role === 'student' && profile.target_institution ? (
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
  hero: {
    // Фон на всю ширину экрана, поверх внутренних отступов Screen.
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  avatarRing: {
    marginTop: spacing.lg,
    padding: 5,
    borderRadius: (AVATAR_SIZE + 10) / 2,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  subtitle: { color: colors.primary, fontWeight: '700', marginTop: 2, textAlign: 'center', paddingHorizontal: spacing.lg },
  cameraBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  wrapper: { alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', paddingHorizontal: spacing.md },
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
