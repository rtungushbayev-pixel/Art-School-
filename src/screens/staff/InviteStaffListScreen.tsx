import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { parseStaffRows, type InviteRole, type StaffRow } from '../../lib/staffImport';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';

const MAX_ROWS = 100;

const STRINGS = {
  ru: {
    hint: 'Откройте заполненный шаблон «Сотрудники» в Excel, выделите строки с сотрудниками (можно вместе с заголовком) и скопируйте. Вставьте сюда — приложение создаст каждому личный код приглашения.',
    placeholder: 'Вставьте строки из Excel',
    roles: { staff: 'Преподаватель', office: 'Администрация', admin: 'Администратор школы' } as Record<InviteRole, string>,
    branchAdmin: 'Администратор филиала',
    unknownRole: 'Должность не распознана — пропустим',
    adminWarning: 'Внимание: администратор школы получает полный доступ.',
    found: (n: number) => `Сотрудников в списке: ${n}`,
    tooMany: (max: number) => `За один раз — не больше ${max} человек.`,
    create: (n: number) => `Создать приглашения: ${n}`,
    created: 'Приглашения созданы. Отправьте каждому его код — он действует 7 дней и только один раз.',
    send: 'Отправить',
    sent: 'Отправлено',
    sendAll: 'Отправить весь список себе',
    afterBranchAdmin: (branch: string) =>
      `После регистрации откройте его профиль и выберите филиал${branch ? ` «${branch}»` : ''} в блоке «Администратор филиала».`,
    inviteText: (name: string, code: string) =>
      `${name}, приглашение в приложение KasteyevSchool для сотрудников школы. Скачайте приложение, на экране регистрации нажмите «Я сотрудник школы» и введите код: ${code}. Код действует 7 дней.`,
    failed: 'Не удалось создать приглашение',
    again: 'Новый список',
  },
  kk: {
    hint: 'Толтырылған «Қызметкерлер» үлгісін Excel-де ашып, қызметкерлер жолдарын көшіріңіз де, осында қойыңыз. Қолданба әрқайсысына жеке шақыру кодын жасайды.',
    placeholder: 'Excel жолдарын қойыңыз',
    roles: { staff: 'Оқытушы', office: 'Әкімшілік', admin: 'Мектеп әкімшісі' } as Record<InviteRole, string>,
    branchAdmin: 'Филиал әкімшісі',
    unknownRole: 'Лауазым танылмады — өткізіп жібереміз',
    adminWarning: 'Назар аударыңыз: мектеп әкімшісі толық қолжетімділік алады.',
    found: (n: number) => `Тізімдегі қызметкерлер: ${n}`,
    tooMany: (max: number) => `Бір рет ${max} адамнан артық емес.`,
    create: (n: number) => `Шақыру жасау: ${n}`,
    created: 'Шақырулар жасалды. Әрқайсысына өз кодын жіберіңіз — 7 күн және бір рет жарамды.',
    send: 'Жіберу',
    sent: 'Жіберілді',
    sendAll: 'Бүкіл тізімді өзіме жіберу',
    afterBranchAdmin: (branch: string) =>
      `Тіркелгеннен кейін оның профилін ашып, «Филиал әкімшісі» блогында${branch ? ` «${branch}»` : ''} филиалын таңдаңыз.`,
    inviteText: (name: string, code: string) =>
      `${name}, мектеп қызметкерлеріне арналған KasteyevSchool қолданбасына шақыру. Қолданбаны жүктеп, тіркелу бетінде «Мен мектеп қызметкерімін» түймесін басып, кодты енгізіңіз: ${code}. Код 7 күн жарамды.`,
    failed: 'Шақыру жасау мүмкін болмады',
    again: 'Жаңа тізім',
  },
  en: {
    hint: 'Open the filled-in "Staff" template in Excel, select the staff rows (the header row is fine) and copy them. Paste here and the app will create a personal invitation code for each.',
    placeholder: 'Paste rows from Excel',
    roles: { staff: 'Teacher', office: 'Office', admin: 'School administrator' } as Record<InviteRole, string>,
    branchAdmin: 'Branch administrator',
    unknownRole: 'Position not recognised — skipped',
    adminWarning: 'Note: a school administrator gets full access.',
    found: (n: number) => `Staff in the list: ${n}`,
    tooMany: (max: number) => `No more than ${max} people at a time.`,
    create: (n: number) => `Create invitations: ${n}`,
    created: 'Invitations created. Send each person their code — it works once and for 7 days.',
    send: 'Send',
    sent: 'Sent',
    sendAll: 'Send the whole list to myself',
    afterBranchAdmin: (branch: string) =>
      `After they sign up, open their profile and pick the branch${branch ? ` "${branch}"` : ''} under "Branch administrator".`,
    inviteText: (name: string, code: string) =>
      `${name}, an invitation to the KasteyevSchool app for school staff. Install the app, tap "I'm school staff" on the sign-up screen and enter the code: ${code}. The code is valid for 7 days.`,
    failed: 'Could not create an invitation',
    again: 'New list',
  },
};

interface Created extends StaffRow {
  code: string;
}

// Только для администратора школы: коды приглашения сразу для списка
// сотрудников (create_staff_invite проверяет права на сервере).
export function InviteStaffListScreen() {
  const s = useStrings(STRINGS);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created[]>([]);
  const [sent, setSent] = useState<Set<number>>(new Set());

  const rows = useMemo(() => parseStaffRows(text), [text]);
  const valid = rows.filter((r) => r.role !== null);
  const tooMany = valid.length > MAX_ROWS;

  const roleLabel = (r: StaffRow) => (r.branchAdmin ? s.branchAdmin : r.role ? s.roles[r.role] : r.roleText || '—');

  const onCreate = async () => {
    if (valid.length === 0 || tooMany) return;
    setBusy(true);
    const result: Created[] = [];
    for (const r of valid) {
      const note = [r.name, roleLabel(r), r.branch, r.phone].filter(Boolean).join(' · ');
      const { data, error } = await supabase.rpc('create_staff_invite', { p_role: r.role, p_note: note });
      if (error || !data) {
        Alert.alert(s.failed, `${r.name}: ${error?.message ?? ''}`);
        break;
      }
      result.push({ ...r, code: String(data) });
    }
    setBusy(false);
    setCreated(result);
    setSent(new Set());
    if (result.length > 0) setText('');
  };

  const send = (i: number, c: Created) => {
    Share.share({ message: s.inviteText(c.name, c.code) })
      .then(() => setSent((prev) => new Set(prev).add(i)))
      .catch(() => {});
  };

  const sendAll = () => {
    const lines = created.map((c) => `${c.name} — ${roleLabel(c)}${c.branch ? `, ${c.branch}` : ''}: ${c.code}`);
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  if (created.length > 0) {
    return (
      <Screen scroll>
        <Text style={styles.hint}>{s.created}</Text>
        {created.map((c, i) => (
          <View key={c.code} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>
                {roleLabel(c)}
                {c.branch ? ` · ${c.branch}` : ''}
                {c.phone ? ` · ${c.phone}` : ''}
              </Text>
              <Text style={styles.code} selectable>
                {c.code}
              </Text>
              {c.branchAdmin ? <Text style={styles.note}>{s.afterBranchAdmin(c.branch)}</Text> : null}
            </View>
            <Pressable onPress={() => send(i, c)} style={[styles.send, sent.has(i) && styles.sendDone]}>
              <Ionicons name={sent.has(i) ? 'checkmark' : 'paper-plane-outline'} size={16} color={colors.white} />
              <Text style={styles.sendText}>{sent.has(i) ? s.sent : s.send}</Text>
            </Pressable>
          </View>
        ))}
        <View style={{ height: spacing.md }} />
        <Button title={s.sendAll} variant="secondary" onPress={sendAll} />
        <View style={{ height: spacing.sm }} />
        <Button title={s.again} variant="secondary" onPress={() => setCreated([])} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.hint}>{s.hint}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={s.placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        style={styles.input}
      />
      {rows.length > 0 ? (
        <View style={styles.preview}>
          <Text style={styles.found}>{s.found(valid.length)}</Text>
          {rows.map((r, i) => (
            <View key={`${i}-${r.name}`} style={styles.previewRow}>
              <Text style={[styles.name, !r.role && styles.skipped]}>{r.name}</Text>
              <Text style={[styles.meta, !r.role && styles.error]}>
                {r.role ? roleLabel(r) : s.unknownRole}
                {r.role && r.branch ? ` · ${r.branch}` : ''}
              </Text>
            </View>
          ))}
          {valid.some((r) => r.role === 'admin') ? <Text style={styles.error}>{s.adminWarning}</Text> : null}
          {tooMany ? <Text style={styles.error}>{s.tooMany(MAX_ROWS)}</Text> : null}
        </View>
      ) : null}
      <View style={{ height: spacing.md }} />
      <Button title={s.create(valid.length)} onPress={onCreate} loading={busy} disabled={valid.length === 0 || tooMany} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  input: {
    minHeight: 160,
    maxHeight: 320,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  preview: { marginTop: spacing.md },
  found: { fontWeight: '700', color: colors.success, marginBottom: spacing.xs },
  previewRow: { paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  code: { fontFamily: 'monospace', fontWeight: '700', color: colors.text, letterSpacing: 1, marginTop: 2 },
  note: { color: colors.warning, fontSize: 12, marginTop: 2 },
  skipped: { color: colors.textMuted, textDecorationLine: 'line-through' },
  error: { color: colors.danger, fontSize: 12, fontWeight: '600', marginTop: spacing.xs },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendDone: { backgroundColor: colors.success },
  sendText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
