import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  PAYMENT_METHOD_LABELS,
  deleteBillingEntry,
  fetchBalances,
  fetchBillingEntries,
  formatMoney,
} from '../../lib/payments';
import { formatDayMonth, parseDateKey } from '../../lib/schedule';
import { colors, spacing } from '../../theme/colors';
import type { BillingEntry, StudentBalance } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

// Баланс и история начислений/оплат ученика. Ученик открывает свои оплаты,
// сотрудник — оплаты выбранного ученика и может добавлять/удалять записи.
export function PaymentsScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'Payments'>>();
  const isStaff = profile?.role === 'staff';
  const studentId = route.params?.studentId ?? profile?.id;

  const [studentName, setStudentName] = useState('');
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [entryRows, balanceRows, { data: student }] = await Promise.all([
        fetchBillingEntries(studentId),
        fetchBalances(studentId),
        supabase.from('profiles').select('full_name').eq('id', studentId).single(),
      ]);
      setEntries(entryRows);
      setBalances(balanceRows);
      setStudentName((student as { full_name: string } | null)?.full_name ?? '');
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = (entry: BillingEntry) => {
    if (!isStaff) return;
    Alert.alert(
      entry.kind === 'charge' ? 'Удалить начисление?' : 'Удалить оплату?',
      `${entry.description} · ${formatMoney(entry.amount, entry.currency)}`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBillingEntry(entry.id);
            } catch (e) {
              Alert.alert('Не удалось удалить', (e as Error).message);
            }
            load();
          },
        },
      ]
    );
  };

  if (!studentId) return null;

  const mainBalance = balances[0];

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {isStaff ? <Text style={styles.header}>{studentName}</Text> : <Text style={styles.header}>Мои оплаты</Text>}

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Баланс</Text>
        {balances.length === 0 ? (
          <Text style={styles.balanceValue}>{formatMoney(0)}</Text>
        ) : (
          balances.map((b) => (
            <Text
              key={b.currency}
              style={[styles.balanceValue, b.balance < 0 ? styles.debt : b.balance > 0 ? styles.credit : null]}
            >
              {b.balance > 0 ? '+' : ''}
              {formatMoney(b.balance, b.currency)}
            </Text>
          ))
        )}
        <Text style={styles.balanceHint}>
          {!mainBalance || mainBalance.balance === 0
            ? 'Задолженности нет'
            : mainBalance.balance < 0
              ? `К оплате ${formatMoney(-mainBalance.balance, mainBalance.currency)}`
              : 'Переплата учтётся в следующих начислениях'}
        </Text>
        {mainBalance ? (
          <Text style={styles.totals}>
            Начислено {formatMoney(mainBalance.charged, mainBalance.currency)} · оплачено{' '}
            {formatMoney(mainBalance.paid, mainBalance.currency)}
          </Text>
        ) : null}
      </Card>

      {isStaff ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              title="Начислить"
              variant="secondary"
              onPress={() => navigation.navigate('BillingEntryForm', { studentId, kind: 'charge' })}
            />
          </View>
          <View style={styles.action}>
            <Button
              title="Принять оплату"
              onPress={() => navigation.navigate('BillingEntryForm', { studentId, kind: 'payment' })}
            />
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>История</Text>
      {entries.length === 0 && !loading ? <Text style={styles.empty}>Записей пока нет</Text> : null}
      {entries.map((entry) => (
        <Pressable key={entry.id} onLongPress={() => onDelete(entry)} delayLongPress={400}>
          <Card style={styles.entryRow}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryTitle}>{entry.description}</Text>
              <Text style={styles.entryMeta}>
                {formatDayMonth(parseDateKey(entry.entry_date))} {entry.entry_date.slice(0, 4)}
                {' · '}
                {entry.kind === 'charge' ? 'Начисление' : 'Оплата'}
                {entry.method ? ` · ${PAYMENT_METHOD_LABELS[entry.method]}` : ''}
              </Text>
            </View>
            <Text style={[styles.amount, entry.kind === 'payment' ? styles.credit : styles.debt]}>
              {entry.kind === 'payment' ? '+' : '−'}
              {formatMoney(entry.amount, entry.currency)}
            </Text>
          </Card>
        </Pressable>
      ))}
      {isStaff && entries.length > 0 ? (
        <Text style={styles.hint}>Удерживайте запись, чтобы удалить ошибочную</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  balanceCard: { alignItems: 'center', paddingVertical: spacing.lg },
  balanceLabel: { color: colors.textMuted, fontWeight: '600' },
  balanceValue: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: spacing.xs },
  balanceHint: { color: colors.text, marginTop: spacing.xs, fontWeight: '600' },
  totals: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13, textAlign: 'center' },
  debt: { color: colors.danger },
  credit: { color: colors.success },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  action: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: spacing.md, marginBottom: spacing.sm },
  empty: { color: colors.textMuted },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  entryInfo: { flex: 1 },
  entryTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  entryMeta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  amount: { fontWeight: '700', fontSize: 15 },
  hint: { color: colors.textMuted, textAlign: 'center', fontSize: 12, marginBottom: spacing.lg },
});
