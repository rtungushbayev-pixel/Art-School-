import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme/colors';
import type { PortfolioStats } from '../lib/portfolio';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: { works: 'Работ', likes: 'Лайков', achievements: 'Достижений' },
  kk: { works: 'Жұмыс', likes: 'Лайк', achievements: 'Жетістік' },
  en: { works: 'Artworks', likes: 'Likes', achievements: 'Achievements' },
};

export function ProfileStats({ stats, showAchievements }: { stats: PortfolioStats; showAchievements: boolean }) {
  const s = useStrings(STRINGS);
  const items = [
    { label: s.works, value: stats.works },
    { label: s.likes, value: stats.likes },
    ...(showAchievements ? [{ label: s.achievements, value: stats.achievements }] : []),
  ];
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: 18, fontWeight: '700', color: colors.primary },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
