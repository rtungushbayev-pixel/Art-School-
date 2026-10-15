import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { errorText } from '../lib/errors';
import { fetchBranches, fetchHeadedBranch, setBranchHead } from '../lib/materials';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';
import type { Branch } from '../types/database';

const STRINGS = {
  ru: {
    title: 'Руководитель филиала',
    hint: 'Руководитель филиала может отправлять заявки на материалы.',
    none: 'Нет',
    failed: 'Не удалось сохранить',
  },
  kk: {
    title: 'Филиал жетекшісі',
    hint: 'Филиал жетекшісі материалдарға өтінім жібере алады.',
    none: 'Жоқ',
    failed: 'Сақтау мүмкін болмады',
  },
  en: {
    title: 'Branch head',
    hint: 'A branch head can send supply requests.',
    none: 'None',
    failed: 'Could not save',
  },
};

// Только для администратора: отметить сотрудника руководителем филиала.
export function BranchHeadPicker({ userId }: { userId: string }) {
  const s = useStrings(STRINGS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchBranches(), fetchHeadedBranch(userId)])
      .then(([all, headed]) => {
        setBranches(all);
        setCurrent(headed?.id ?? null);
      })
      .catch(() => {});
  }, [userId]);

  const choose = async (branchId: string | null) => {
    if (saving || branchId === current) return;
    setSaving(true);
    try {
      await setBranchHead(userId, branchId);
      setCurrent(branchId);
    } catch (e) {
      Alert.alert(s.failed, errorText(e));
    }
    setSaving(false);
  };

  if (branches.length === 0) return null;

  const chip = (id: string | null, label: string) => {
    const active = current === id;
    return (
      <Pressable
        key={id ?? 'none'}
        onPress={() => choose(id)}
        disabled={saving}
        style={[styles.chip, active && styles.chipActive]}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.hint}>{s.hint}</Text>
      <View style={styles.row}>
        {chip(null, s.none)}
        {branches.map((b) => chip(b.id, b.name))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  title: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
});
