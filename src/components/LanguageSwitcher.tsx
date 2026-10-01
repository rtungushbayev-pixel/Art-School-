import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LANGUAGES, useLanguage } from '../i18n';
import { colors, spacing } from '../theme/colors';

// Переключатель языка: РУС / ҚАЗ / ENG. compact — для угла экрана входа.
export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage();
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {LANGUAGES.map((item) => {
        const active = item.code === lang;
        return (
          <Pressable
            key={item.code}
            onPress={() => setLang(item.code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            style={[styles.item, compact && styles.itemCompact, active && styles.itemActive]}
          >
            <Text style={[styles.text, compact && styles.textCompact, active && styles.textActive]}>
              {compact ? item.short : item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    padding: 3,
  },
  rowCompact: { alignSelf: 'flex-end' },
  item: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 999 },
  itemCompact: { flex: 0, paddingHorizontal: spacing.sm + 2, paddingVertical: 6 },
  itemActive: { backgroundColor: colors.primary },
  text: { fontWeight: '700', color: colors.textMuted },
  textCompact: { fontSize: 12 },
  textActive: { color: colors.white },
});
