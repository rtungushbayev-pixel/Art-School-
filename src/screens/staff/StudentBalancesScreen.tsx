import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { fetchBalances, formatMoney } from '../../lib/payments';
import { colors, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    totalDebt: 'Общий долг учеников',
    debtors: (count: number) => `Должников: ${count}`,
    search: 'Поиск по имени',
    onlyDebtors: 'Только должники',
    nobody: 'Никого не найдено',
    noName: 'Без имени',
  },
  kk: {
    totalDebt: 'Оқушылардың жалпы қарызы',
    debtors: (count: number) => `Қарыздарлар: ${count}`,
    search: 'Аты бойынша іздеу',
    onlyDebtors: 'Тек қарыздарлар',
    nobody: 'Ешкім табылмады',
    noName: 'Аты жоқ',
  },
  en: {
    totalDebt: 'Total student debt',
    debtors: (count: number) => `Students in debt: ${count}`,
    search: 'Search by name',
    onlyDebtors: 'Only students in debt',
    nobody: 'No one found',
    noName: 'No name',
  },
};

interface Row {
  student: Profile;
  balance: number;
  currency: string;
}

// Все ученики с балансом: сначала должники (по сумме долга), потом остальные.
export function StudentBalancesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const s = useStrings(STRINGS);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: students, error }, balances] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
        fetchBalances(),
      ]);
      if (error) throw error;
      const byStudent = new Map(balances.map((b) => [b.student_id, b]));
      const list = ((students as Profile[]) ?? []).map((student) => {
        const b = byStudent.get(student.id);
        return { student, balance: b?.balance ?? 0, currency: b?.currency ?? 'KZT' };
      });
      list.sort((a, b) => a.balance - b.balance || a.student.full_name.localeCompare(b.student.full_name));
      setRows(list);
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalDebt = rows.reduce((sum, r) => (r.balance < 0 ? sum - r.balance : sum), 0);
  const debtorsCount = rows.filter((r) => r.balance < 0).length;
  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) => (!onlyDebtors || r.balance < 0) && (!q || r.student.full_name.toLowerCase().includes(q))
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>{s.totalDebt}</Text>
        <Text style={[styles.summaryValue, totalDebt > 0 && styles.debt]}>{formatMoney(totalDebt)}</Text>
        <Text style={styles.summaryHint}>{s.debtors(debtorsCount)}</Text>
      </Card>

      <TextField placeholder={s.search} value={query} onChangeText={setQuery} />
      <Pressable onPress={() => setOnlyDebtors((v) => !v)} style={styles.filterRow}>
        <View style={[styles.checkbox, onlyDebtors && styles.checkboxOn]} />
        <Text style={styles.filterText}>{s.onlyDebtors}</Text>
      </Pressable>

      {visible.length === 0 && !loading ? <Text style={styles.empty}>{s.nobody}</Text> : null}
      {visible.map(({ student, balance, currency }) => (
        <Pressable key={student.id} onPress={() => navigation.navigate('Payments', { studentId: student.id })}>
          <Card style={styles.row}>
            <Avatar uri={student.avatar_url} name={student.full_name} size={36} />
            <Text style={styles.name}>{student.full_name || s.noName}</Text>
            <Text style={[styles.balance, balance < 0 ? styles.debt : balance > 0 ? styles.credit : null]}>
              {balance > 0 ? '+' : ''}
              {formatMoney(balance, currency)}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center' },
  summaryLabel: { color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.xs },
  summaryHint: { color: colors.textMuted, marginTop: spacing.xs },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.primary },
  checkboxOn: { backgroundColor: colors.primary },
  filterText: { color: colors.text, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontWeight: '600', color: colors.text },
  balance: { fontWeight: '700', color: colors.text },
  debt: { color: colors.danger },
  credit: { color: colors.success },
});
