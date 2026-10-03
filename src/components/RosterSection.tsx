import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';

interface RosterEntry {
  id: string;
  full_name: string;
  code: string;
  student_id: string | null;
}

const STRINGS = {
  ru: {
    title: 'Коды учеников',
    hint: 'Список учеников группы от школы. Выдайте каждому ребёнку его код: по нему регистрируется ученик и его родители.',
    namePlaceholder: 'ФИО ученика',
    add: 'Добавить',
    registered: 'зарегистрирован',
    waiting: 'ещё не зарегистрирован',
    empty: 'В списке пока никого. Добавьте учеников по одному или загрузите список в Supabase (таблица school_roster).',
    actions: 'Действия с кодом',
    share: 'Отправить код',
    regenerate: 'Выдать новый код',
    regenerateConfirm: 'Старый код перестанет работать. Используйте, если код попал к посторонним.',
    remove: 'Удалить из списка',
    cancel: 'Отмена',
    failed: 'Не получилось',
    shareText: (name: string, code: string) =>
      `${name}, ваш код для регистрации в приложении KasteyevSchool: ${code}. Он нужен ученику и родителям.`,
  },
  kk: {
    title: 'Оқушы кодтары',
    hint: 'Мектептен келген топ оқушыларының тізімі. Әр балаға өз кодын беріңіз: ол арқылы оқушы мен оның ата-анасы тіркеледі.',
    namePlaceholder: 'Оқушының аты-жөні',
    add: 'Қосу',
    registered: 'тіркелген',
    waiting: 'әлі тіркелмеген',
    empty: 'Тізім әзірге бос. Оқушыларды бір-бірден қосыңыз немесе тізімді Supabase-ке жүктеңіз (school_roster кестесі).',
    actions: 'Кодпен әрекеттер',
    share: 'Кодты жіберу',
    regenerate: 'Жаңа код беру',
    regenerateConfirm: 'Ескі код жұмыс істемейді. Код бөгде адамдарға тиіп кетсе қолданыңыз.',
    remove: 'Тізімнен жою',
    cancel: 'Бас тарту',
    failed: 'Сәтсіз аяқталды',
    shareText: (name: string, code: string) =>
      `${name}, KasteyevSchool қолданбасында тіркелуге арналған кодыңыз: ${code}. Ол оқушыға және ата-анаға қажет.`,
  },
  en: {
    title: 'Student codes',
    hint: "The school's list of students in this group. Give each child their code: the student and their parents sign up with it.",
    namePlaceholder: "Student's full name",
    add: 'Add',
    registered: 'signed up',
    waiting: 'not signed up yet',
    empty: 'The list is empty. Add students one by one or upload the list in Supabase (school_roster table).',
    actions: 'Code actions',
    share: 'Send code',
    regenerate: 'Issue a new code',
    regenerateConfirm: 'The old code will stop working. Use this if the code got to strangers.',
    remove: 'Remove from list',
    cancel: 'Cancel',
    failed: 'Something went wrong',
    shareText: (name: string, code: string) =>
      `${name}, your sign-up code for the KasteyevSchool app: ${code}. The student and parents need it.`,
  },
};

// Список учеников группы с кодами регистрации. Видят и ведут только сотрудники
// (RLS school_roster_staff).
export function RosterSection({ groupId }: { groupId: string }) {
  const s = useStrings(STRINGS);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('school_roster')
      .select('id, full_name, code, student_id')
      .eq('group_id', groupId)
      .order('full_name');
    setEntries((data as RosterEntry[]) ?? []);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (e: unknown) => Alert.alert(s.failed, e instanceof Error ? e.message : (e as any)?.message);

  const onAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('school_roster').insert({ full_name: name.trim(), group_id: groupId });
    setAdding(false);
    if (error) return fail(error);
    setName('');
    load();
  };

  const onActions = (entry: RosterEntry) => {
    Alert.alert(entry.full_name, entry.code, [
      {
        text: s.share,
        onPress: () => Share.share({ message: s.shareText(entry.full_name, entry.code) }).catch(() => {}),
      },
      {
        text: s.regenerate,
        onPress: () =>
          Alert.alert(s.regenerate, s.regenerateConfirm, [
            { text: s.cancel, style: 'cancel' },
            {
              text: s.regenerate,
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase.rpc('regenerate_roster_code', { p_roster_id: entry.id });
                if (error) fail(error);
                else load();
              },
            },
          ]),
      },
      ...(entry.student_id
        ? []
        : [
            {
              text: s.remove,
              style: 'destructive' as const,
              onPress: async () => {
                const { error } = await supabase.from('school_roster').delete().eq('id', entry.id);
                if (error) fail(error);
                else load();
              },
            },
          ]),
      { text: s.cancel, style: 'cancel' as const },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.hint}>{s.hint}</Text>

      <View style={styles.addRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={s.namePlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable onPress={onAdd} disabled={adding || !name.trim()} style={[styles.addButton, (adding || !name.trim()) && styles.disabled]}>
          <Text style={styles.addText}>{s.add}</Text>
        </Pressable>
      </View>

      {entries.length === 0 ? <Text style={styles.empty}>{s.empty}</Text> : null}
      {entries.map((entry) => (
        <Pressable key={entry.id} style={styles.row} onPress={() => onActions(entry)} accessibilityLabel={s.actions}>
          <View style={styles.rowText}>
            <Text style={styles.name}>{entry.full_name}</Text>
            <Text style={[styles.status, entry.student_id ? styles.statusDone : null]}>
              {entry.student_id ? s.registered : s.waiting}
            </Text>
          </View>
          <Text style={styles.code} selectable>
            {entry.code}
          </Text>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.lg },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.sm },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  addText: { color: colors.white, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  name: { fontWeight: '600', color: colors.text },
  status: { color: colors.warning, fontSize: 12, marginTop: 1 },
  statusDone: { color: colors.success },
  code: { fontFamily: 'monospace', fontWeight: '700', color: colors.text, letterSpacing: 1 },
});
