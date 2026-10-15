import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadow, spacing } from '../theme/colors';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: { profile: 'Профиль', posts: 'Публикации' },
  kk: { profile: 'Профиль', posts: 'Жарияланымдар' },
  en: { profile: 'Profile', posts: 'Posts' },
};

export type ProfileTab = 'profile' | 'posts';

const TABS: ProfileTab[] = ['profile', 'posts'];

export function ProfileTabs({ value, onChange }: { value: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  const s = useStrings(STRINGS);
  return (
    <View style={styles.segment}>
      {TABS.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onChange(tab)}
          style={[styles.item, value === tab && styles.itemActive]}
        >
          <Text style={[styles.text, value === tab && styles.textActive]}>{s[tab]}</Text>
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
