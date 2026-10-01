import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadow, spacing } from '../theme/colors';

export type ProfileTab = 'profile' | 'posts';

const TABS: { value: ProfileTab; label: string }[] = [
  { value: 'profile', label: 'Профиль' },
  { value: 'posts', label: 'Публикации' },
];

export function ProfileTabs({ value, onChange }: { value: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  return (
    <View style={styles.segment}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.value}
          onPress={() => onChange(tab.value)}
          style={[styles.item, value === tab.value && styles.itemActive]}
        >
          <Text style={[styles.text, value === tab.value && styles.textActive]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    padding: 4,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  item: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: 999, alignItems: 'center' },
  itemActive: { backgroundColor: colors.surface, ...shadow.soft },
  text: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
  textActive: { color: colors.text },
});
