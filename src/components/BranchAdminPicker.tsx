import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { errorText } from '../lib/errors';
import { fetchBranches } from '../lib/materials';
import { fetchAdminBranchIds, setBranchAdmin } from '../lib/branchAdmins';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';
import type { Branch } from '../types/database';

const STRINGS = {
  ru: {
    title: 'Администратор филиала',
    hint: 'В группах выбранного филиала ведёт списки детей и коды, состав групп, расписание и посещаемость. Роли и другие филиалы недоступны.',
    none: 'Нет',
    failed: 'Не удалось сохранить',
  },
  kk: {
    title: 'Филиал әкімшісі',
    hint: 'Таңдалған филиалдың топтарында балалар тізімін, кодтарды, топ құрамын, кестені және қатысуды жүргізеді.',
    none: 'Жоқ',
    failed: 'Сақтау мүмкін болмады',
  },
  en: {
    title: 'Branch administrator',
    hint: "Manages student lists and codes, group members, schedule and attendance in the chosen branch's groups. No roles or other branches.",
    none: 'None',
    failed: 'Could not save',
  },
};

// Только для администратора школы: поручить преподавателю вести филиал.
export function BranchAdminPicker({ userId }: { userId: string }) {
  const s = useStrings(STRINGS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchBranches(), fetchAdminBranchIds(userId)])
      .then(([all, ids]) => {
        setBranches(all);
        setCurrent(ids[0] ?? null);
      })
      .catch(() => {});
  }, [userId]);

  const choose = async (branchId: string | null) => {
    if (saving || branchId === current) return;
    setSaving(true);
    try {
      await setBranchAdmin(userId, branchId);
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
