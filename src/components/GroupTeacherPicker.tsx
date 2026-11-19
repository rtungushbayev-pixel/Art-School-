import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { errorText } from '../lib/errors';
import { fetchStaffProfiles } from '../lib/groups';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';
import type { Profile } from '../types/database';

const STRINGS = {
  ru: { title: 'Преподаватель группы', none: 'Не назначен', failed: 'Не удалось сохранить' },
  kk: { title: 'Топтың мұғалімі', none: 'Тағайындалмаған', failed: 'Сақтау мүмкін болмады' },
  en: { title: 'Group teacher', none: 'Not assigned', failed: 'Could not save' },
};

// Только для администратора: кто ведёт группу. При замене (болезнь, отпуск)
// администратор выбирает другого преподавателя, и группа переходит к нему.
export function GroupTeacherPicker({
  groupId,
  teacherId,
  onChange,
}: {
  groupId: string;
  teacherId: string | null;
  onChange?: (id: string | null) => void;
}) {
  const s = useStrings(STRINGS);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [current, setCurrent] = useState<string | null>(teacherId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaffProfiles().then(setTeachers).catch(() => {});
  }, []);

  useEffect(() => setCurrent(teacherId), [teacherId]);

  const choose = async (id: string | null) => {
    if (saving || id === current) return;
    setSaving(true);
    const { error } = await supabase.from('groups').update({ teacher_id: id }).eq('id', groupId);
    if (error) Alert.alert(s.failed, errorText(error));
    else {
      setCurrent(id);
      onChange?.(id);
    }
    setSaving(false);
  };

  if (teachers.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{s.title}</Text>
      <View style={styles.row}>
        {[{ id: null as string | null, full_name: s.none }, ...teachers].map((t) => {
          const active = current === t.id;
          return (
            <Pressable
              key={t.id ?? 'none'}
              onPress={() => choose(t.id)}
              disabled={saving}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.full_name}</Text>
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
