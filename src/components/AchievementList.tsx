import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, paint, radius, spacing } from '../theme/colors';
import { ACHIEVEMENT_KIND_LABELS } from '../lib/portfolio';
import type { AchievementKind, StudentAchievement } from '../types/database';

const KIND_ICONS: Record<AchievementKind, keyof typeof Ionicons.glyphMap> = {
  competition: 'trophy-outline',
  exhibition: 'images-outline',
  award: 'ribbon-outline',
  other: 'star-outline',
};

const KIND_COLORS: Record<AchievementKind, string> = {
  competition: paint.ochre,
  exhibition: paint.teal,
  award: paint.coral,
  other: paint.violet,
};

export function formatEventDate(date: string | null): string | null {
  if (!date) return null;
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

interface AchievementListProps {
  achievements: StudentAchievement[];
  // Без onPress записи только для чтения
  onPress?: (achievement: StudentAchievement) => void;
}

export function AchievementList({ achievements, onPress }: AchievementListProps) {
  return (
    <View style={styles.list}>
      {achievements.map((item) => {
        const meta = [ACHIEVEMENT_KIND_LABELS[item.kind], item.result, formatEventDate(item.event_date)]
          .filter(Boolean)
          .join(' · ');
        return (
          <Pressable
            key={item.id}
            disabled={!onPress}
            onPress={() => onPress?.(item)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.icon, { backgroundColor: KIND_COLORS[item.kind] }]}>
              <Ionicons name={KIND_ICONS[item.kind]} size={18} color={colors.white} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{meta}</Text>
            </View>
            {item.verified ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.verifiedText}>Школа</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: colors.success },
});
