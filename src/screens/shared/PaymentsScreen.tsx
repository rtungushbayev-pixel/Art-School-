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
  deleteBillingEntry,
  fetchBalances,
  fetchBillingEntries,
  formatMoney,
  paymentMethodLabel,
} from '../../lib/payments';
import { formatDayMonth, parseDateKey } from '../../lib/schedule';
import { colors, spacing } from '../../theme/colors';
import type { BillingEntry, StudentBalance } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    deleteCharge: 'Удалить начисление?',
    deletePayment: 'Удалить оплату?',
    cancel: 'Отмена',
    delete: 'Удалить',
    deleteFailed: 'Не удалось удалить',
    myPayments: 'Мои оплаты',
    balance: 'Баланс',
    noDebt: 'Задолженности нет',
    toPay: (amount: string) => `К оплате ${amount}`,
    overpaid: 'Переплата учтётся в следующих начислениях',
    charged: 'Начислено',
    paid: 'оплачено',
    charge: 'Начислить',
    acceptPayment: 'Принять оплату',
    history: 'История',
    noEntries: 'Записей пока нет',
    kindCharge: 'Начисление',
    kindPayment: 'Оплата',
    deleteHint: 'Удерживайте запись, чтобы удалить ошибочную',
  },
  kk: {
    deleteCharge: 'Есептеуді жою керек пе?',
    deletePayment: 'Төлемді жою керек пе?',
    cancel: 'Бас тарту',
    delete: 'Жою',
    deleteFailed: 'Жою мүмкін болмады',
    myPayments: 'Менің төлемдерім',
    balance: 'Баланс',
    noDebt: 'Қарыз жоқ',
    toPay: (amount: string) => `Төлеуге ${amount}`,
    overpaid: 'Артық төлем келесі есептеулерде ескеріледі',
    charged: 'Есептелді',
    paid: 'төленді',
    charge: 'Есептеу',
    acceptPayment: 'Төлем қабылдау',
    history: 'Тарих',
    noEntries: 'Әзірге жазбалар жоқ',
    kindCharge: 'Есептеу',
    kindPayment: 'Төлем',
    deleteHint: 'Қате жазбаны жою үшін оны басып тұрыңыз',
  },
  en: {
    deleteCharge: 'Delete this charge?',
    deletePayment: 'Delete this payment?',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteFailed: 'Could not delete',
    myPayments: 'My payments',
    balance: 'Balance',
    noDebt: 'Nothing owed',
    toPay: (amount: string) => `Amount due: ${amount}`,
    overpaid: 'The overpayment will be applied to future charges',
    charged: 'Charged',
    paid: 'paid',
    charge: 'Add charge',
    acceptPayment: 'Record payment',
    history: 'History',
    noEntries: 'No entries yet',
    kindCharge: 'Charge',
    kindPayment: 'Payment',
    deleteHint: 'Press and hold an entry to delete it if it was added by mistake',
  },
};

type NavParamList = StudentStackParamList & StaffStackParamList;

// Баланс и история начислений/оплат ученика. Ученик открывает свои оплаты,
// сотрудник — оплаты выбранного ученика и может добавлять/удалять записи.
export function PaymentsScreen() {
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
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
      entry.kind === 'charge' ? s.deleteCharge : s.deletePayment,
      `${entry.description} · ${formatMoney(entry.amount, entry.currency)}`,
      [
        { text: s.cancel, style: 'cancel' },
        {
          text: s.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBillingEntry(entry.id);
            } catch (e) {
              Alert.alert(s.deleteFailed, (e as Error).message);
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
      {isStaff ? <Text style={styles.header}>{studentName}</Text> : <Text style={styles.header}>{s.myPayments}</Text>}

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{s.balance}</Text>
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
            ? s.noDebt
            : mainBalance.balance < 0
              ? s.toPay(formatMoney(-mainBalance.balance, mainBalance.currency))
              : s.overpaid}
        </Text>
        {mainBalance ? (
          <Text style={styles.totals}>
            {s.charged} {formatMoney(mainBalance.charged, mainBalance.currency)} · {s.paid}{' '}
            {formatMoney(mainBalance.paid, mainBalance.currency)}
          </Text>
        ) : null}
      </Card>

      {isStaff ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              title={s.charge}
              variant="secondary"
              onPress={() => navigation.navigate('BillingEntryForm', { studentId, kind: 'charge' })}
            />
          </View>
          <View style={styles.action}>
            <Button
              title={s.acceptPayment}
              onPress={() => navigation.navigate('BillingEntryForm', { studentId, kind: 'payment' })}
            />
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{s.history}</Text>
      {entries.length === 0 && !loading ? <Text style={styles.empty}>{s.noEntries}</Text> : null}
      {entries.map((entry) => (
        <Pressable key={entry.id} onLongPress={() => onDelete(entry)} delayLongPress={400}>
          <Card style={styles.entryRow}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryTitle}>{entry.description}</Text>
              <Text style={styles.entryMeta}>
                {formatDayMonth(parseDateKey(entry.entry_date))} {entry.entry_date.slice(0, 4)}
                {' · '}
                {entry.kind === 'charge' ? s.kindCharge : s.kindPayment}
                {entry.method ? ` · ${paymentMethodLabel(entry.method)}` : ''}
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
        <Text style={styles.hint}>{s.deleteHint}</Text>
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
