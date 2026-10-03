import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { errorText } from '../lib/errors';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';

interface RosterEntry {
  id: string;
  full_name: string;
  code: string;
  parent_code: string;
  student_id: string | null;
}

type CodeKind = 'student' | 'parent';

const STRINGS = {
  ru: {
    title: 'Коды учеников',
    hint: 'Список учеников группы от школы. У каждого два кода: код ученика (для регистрации ребёнка, одноразовый) и код для родителей (выдаётся лично родителям).',
    namePlaceholder: 'ФИО ученика',
    add: 'Добавить',
    registered: 'зарегистрирован',
    waiting: 'ещё не зарегистрирован',
    studentCode: 'Ученик',
    parentCode: 'Родители',
    empty: 'В списке пока никого. Добавьте учеников по одному или загрузите список в Supabase (таблица school_roster).',
    actions: 'Действия с кодами',
    shareStudent: 'Отправить код ученика',
    shareParent: 'Отправить код для родителей',
    regenerateStudent: 'Новый код ученика',
    regenerateParent: 'Новый код для родителей',
    regenerateConfirm: 'Старый код перестанет работать. Используйте, если код попал к посторонним.',
    remove: 'Удалить из списка',
    cancel: 'Отмена',
    failed: 'Не получилось',
    shareStudentText: (name: string, code: string) =>
      `${name}, твой код для регистрации в приложении KasteyevSchool: ${code}. Выбери «Ученик», свою группу и введи код. Никому его не показывай.`,
    shareParentText: (name: string, code: string) =>
      `Код для родителей ученика ${name} в приложении KasteyevSchool: ${code}. При регистрации выберите «Родитель» и введите код. Не передавайте его посторонним: по нему видны успехи и фото ребёнка.`,
  },
  kk: {
    title: 'Оқушы кодтары',
    hint: 'Мектептен келген топ оқушыларының тізімі. Әрқайсысында екі код бар: оқушы коды (баланы тіркеуге, бір реттік) және ата-аналарға арналған код (ата-аналарға жеке беріледі).',
    namePlaceholder: 'Оқушының аты-жөні',
    add: 'Қосу',
    registered: 'тіркелген',
    waiting: 'әлі тіркелмеген',
    studentCode: 'Оқушы',
    parentCode: 'Ата-ана',
    empty: 'Тізім әзірге бос. Оқушыларды бір-бірден қосыңыз немесе тізімді Supabase-ке жүктеңіз (school_roster кестесі).',
    actions: 'Кодтармен әрекеттер',
    shareStudent: 'Оқушы кодын жіберу',
    shareParent: 'Ата-аналар кодын жіберу',
    regenerateStudent: 'Жаңа оқушы коды',
    regenerateParent: 'Ата-аналарға жаңа код',
    regenerateConfirm: 'Ескі код жұмыс істемейді. Код бөгде адамдарға тиіп кетсе қолданыңыз.',
    remove: 'Тізімнен жою',
    cancel: 'Бас тарту',
    failed: 'Сәтсіз аяқталды',
    shareStudentText: (name: string, code: string) =>
      `${name}, KasteyevSchool қолданбасында тіркелуге арналған кодың: ${code}. «Оқушы», өз тобыңды таңдап, кодты енгіз. Оны ешкімге көрсетпе.`,
    shareParentText: (name: string, code: string) =>
      `KasteyevSchool қолданбасындағы ${name} оқушысының ата-аналарына арналған код: ${code}. Тіркелу кезінде «Ата-ана» таңдап, кодты енгізіңіз. Оны бөгде адамдарға бермеңіз: ол арқылы баланың жетістіктері мен фотолары көрінеді.`,
  },
  en: {
    title: 'Student codes',
    hint: "The school's list of students in this group. Each has two codes: the student code (for the child's sign-up, single use) and the parent code (given to parents personally).",
    namePlaceholder: "Student's full name",
    add: 'Add',
    registered: 'signed up',
    waiting: 'not signed up yet',
    studentCode: 'Student',
    parentCode: 'Parents',
    empty: 'The list is empty. Add students one by one or upload the list in Supabase (school_roster table).',
    actions: 'Code actions',
    shareStudent: 'Send student code',
    shareParent: 'Send parent code',
    regenerateStudent: 'New student code',
    regenerateParent: 'New parent code',
    regenerateConfirm: 'The old code will stop working. Use this if the code got to strangers.',
    remove: 'Remove from list',
    cancel: 'Cancel',
    failed: 'Something went wrong',
    shareStudentText: (name: string, code: string) =>
      `${name}, your sign-up code for the KasteyevSchool app: ${code}. Choose "Student", your group and enter the code. Don't show it to anyone.`,
    shareParentText: (name: string, code: string) =>
      `Parent code for ${name} in the KasteyevSchool app: ${code}. When signing up, choose "Parent" and enter the code. Don't give it to strangers: it shows the child's progress and photos.`,
  },
};

// Список учеников группы с кодами регистрации. Видят и ведут администратор
// и преподаватель этой группы (RLS school_roster_manager); коды и привязку
// к аккаунту меняет только сервер (protect_roster_fields).
export function RosterSection({ groupId }: { groupId: string }) {
  const s = useStrings(STRINGS);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('school_roster')
      .select('id, full_name, code, parent_code, student_id')
      .eq('group_id', groupId)
      .order('full_name');
    setEntries((data as RosterEntry[]) ?? []);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (e: unknown) => Alert.alert(s.failed, errorText(e));

  const onAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('school_roster').insert({ full_name: name.trim(), group_id: groupId });
    setAdding(false);
    if (error) return fail(error);
    setName('');
    load();
  };

  const regenerate = (entry: RosterEntry, kind: CodeKind) =>
    Alert.alert(kind === 'parent' ? s.regenerateParent : s.regenerateStudent, s.regenerateConfirm, [
      { text: s.cancel, style: 'cancel' },
      {
        text: kind === 'parent' ? s.regenerateParent : s.regenerateStudent,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('regenerate_roster_code', { p_roster_id: entry.id, p_kind: kind });
          if (error) fail(error);
          else load();
        },
      },
    ]);

  const onActions = (entry: RosterEntry) => {
    Alert.alert(entry.full_name, undefined, [
      ...(entry.student_id
        ? []
        : [
            {
              text: s.shareStudent,
              onPress: () =>
                Share.share({ message: s.shareStudentText(entry.full_name, entry.code) }).catch(() => {}),
            },
          ]),
      {
        text: s.shareParent,
        onPress: () => Share.share({ message: s.shareParentText(entry.full_name, entry.parent_code) }).catch(() => {}),
      },
      ...(entry.student_id ? [] : [{ text: s.regenerateStudent, onPress: () => regenerate(entry, 'student') }]),
      { text: s.regenerateParent, onPress: () => regenerate(entry, 'parent') },
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
        <Pressable
          onPress={onAdd}
          disabled={adding || !name.trim()}
          style={[styles.addButton, (adding || !name.trim()) && styles.disabled]}
        >
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
            {entry.student_id ? null : (
              <Text style={styles.codeLine} selectable>
                {s.studentCode}: <Text style={styles.code}>{entry.code}</Text>
              </Text>
            )}
            <Text style={styles.codeLine} selectable>
              {s.parentCode}: <Text style={styles.code}>{entry.parent_code}</Text>
            </Text>
          </View>
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
  addButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
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
  codeLine: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  code: { fontFamily: 'monospace', fontWeight: '700', color: colors.text, letterSpacing: 1 },
});
