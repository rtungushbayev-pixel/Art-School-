import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { errorText } from '../lib/errors';
import { fetchBranches } from '../lib/materials';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';
import type { Branch } from '../types/database';

const STRINGS = {
  ru: { title: 'Филиал группы', none: 'Не указан', failed: 'Не удалось сохранить' },
  kk: { title: 'Топтың филиалы', none: 'Көрсетілмеген', failed: 'Сақтау мүмкін болмады' },
  en: { title: 'Group branch', none: 'Not set', failed: 'Could not save' },
};

// Только для администратора: в каком филиале занимается группа (для сводок).
export function GroupBranchPicker({ groupId, branchId }: { groupId: string; branchId: string | null }) {
  const s = useStrings(STRINGS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [current, setCurrent] = useState<string | null>(branchId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {});
  }, []);

  useEffect(() => setCurrent(branchId), [branchId]);

  const choose = async (id: string | null) => {
    if (saving || id === current) return;
    setSaving(true);
    const { error } = await supabase.from('groups').update({ branch_id: id }).eq('id', groupId);
    if (error) Alert.alert(s.failed, errorText(error));
    else setCurrent(id);
    setSaving(false);
  };

  if (branches.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{s.title}</Text>
      <View style={styles.row}>
        {[{ id: null as string | null, name: s.none }, ...branches].map((b) => {
          const active = current === b.id;
          return (
            <Pressable
              key={b.id ?? 'none'}
              onPress={() => choose(b.id)}
              disabled={saving}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.md },
  title: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
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
