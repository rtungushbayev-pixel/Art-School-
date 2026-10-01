import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { fetchGroupMembers } from '../../lib/groups';
import { addBillingEntries, formatMoney, paymentMethodLabel } from '../../lib/payments';
import { parseDateKey, toDateKey } from '../../lib/schedule';
import { colors, radius, spacing } from '../../theme/colors';
import type { PaymentMethod } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    titleCharge: 'Начисление',
    titlePayment: 'Оплата',
    groupTarget: (name: string, count: number) => `Группа «${name}» · учеников: ${count}`,
    needAmount: 'Укажите сумму больше нуля',
    needChargeReason: 'Укажите, за что начисление',
    needPaymentReason: 'Укажите, за что оплата',
    needDate: 'Укажите дату в формате ГГГГ-ММ-ДД',
    noStudents: 'В группе нет учеников',
    saveFailed: 'Не удалось сохранить',
    chargeGroupTitle: 'Начислить всей группе?',
    chargeGroupMessage: (amount: string, count: number) => `${amount} каждому из ${count} учеников`,
    cancel: 'Отмена',
    charge: 'Начислить',
    amount: 'Сумма, ₸',
    amountPlaceholder: 'Например: 25000',
    forWhat: 'За что',
    comment: 'Комментарий',
    chargePlaceholder: 'Например: Октябрь, живопись',
    paymentPlaceholder: 'Например: Оплата за октябрь',
    date: 'Дата (ГГГГ-ММ-ДД)',
    method: 'Способ оплаты',
    savePayment: 'Сохранить оплату',
  },
  kk: {
    titleCharge: 'Есептеу',
    titlePayment: 'Төлем',
    groupTarget: (name: string, count: number) => `«${name}» тобы · оқушылар: ${count}`,
    needAmount: 'Нөлден үлкен соманы көрсетіңіз',
    needChargeReason: 'Не үшін есептелетінін көрсетіңіз',
    needPaymentReason: 'Не үшін төленетінін көрсетіңіз',
    needDate: 'Күнді ЖЖЖЖ-АА-КК пішімінде көрсетіңіз',
    noStudents: 'Топта оқушылар жоқ',
    saveFailed: 'Сақтау мүмкін болмады',
    chargeGroupTitle: 'Бүкіл топқа есептеу керек пе?',
    chargeGroupMessage: (amount: string, count: number) => `${count} оқушының әрқайсысына ${amount}`,
    cancel: 'Бас тарту',
    charge: 'Есептеу',
    amount: 'Сома, ₸',
    amountPlaceholder: 'Мысалы: 25000',
    forWhat: 'Не үшін',
    comment: 'Пікір',
    chargePlaceholder: 'Мысалы: Қазан, кескіндеме',
    paymentPlaceholder: 'Мысалы: Қазан айы үшін төлем',
    date: 'Күні (ЖЖЖЖ-АА-КК)',
    method: 'Төлем тәсілі',
    savePayment: 'Төлемді сақтау',
  },
  en: {
    titleCharge: 'Charge',
    titlePayment: 'Payment',
    groupTarget: (name: string, count: number) => `Group “${name}” · students: ${count}`,
    needAmount: 'Enter an amount greater than zero',
    needChargeReason: 'Specify what the charge is for',
    needPaymentReason: 'Specify what the payment is for',
    needDate: 'Enter the date as YYYY-MM-DD',
    noStudents: 'There are no students in the group',
    saveFailed: 'Could not save',
    chargeGroupTitle: 'Charge the whole group?',
    chargeGroupMessage: (amount: string, count: number) => `${amount} to each of ${count} students`,
    cancel: 'Cancel',
    charge: 'Add charge',
    amount: 'Amount, ₸',
    amountPlaceholder: 'For example: 25000',
    forWhat: 'What for',
    comment: 'Comment',
    chargePlaceholder: 'For example: October, painting',
    paymentPlaceholder: 'For example: Payment for October',
    date: 'Date (YYYY-MM-DD)',
    method: 'Payment method',
    savePayment: 'Save payment',
  },
};

type Props = NativeStackScreenProps<StaffStackParamList, 'BillingEntryForm'>;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const METHODS: PaymentMethod[] = ['cash', 'card', 'transfer'];

// Начисление или оплата для одного ученика, либо начисление всей группе
// (например, ежемесячная плата за занятия).
export function BillingEntryFormScreen({ route }: Props) {
  const { kind } = route.params;
  const studentId = 'studentId' in route.params ? route.params.studentId : null;
  const groupId = 'groupId' in route.params ? route.params.groupId : null;
  const navigation = useNavigation();
  const s = useStrings(STRINGS);

  const [targetLabel, setTargetLabel] = useState('');
  const [recipientIds, setRecipientIds] = useState<string[]>(studentId ? [studentId] : []);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(toDateKey(new Date()));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: kind === 'charge' ? s.titleCharge : s.titlePayment });
      (async () => {
        if (studentId) {
          const { data } = await supabase.from('profiles').select('full_name').eq('id', studentId).single();
          setTargetLabel((data as { full_name: string } | null)?.full_name ?? '');
        } else if (groupId) {
          const [{ data }, members] = await Promise.all([
            supabase.from('groups').select('name').eq('id', groupId).single(),
            fetchGroupMembers(groupId),
          ]);
          setRecipientIds(members.map((m) => m.id));
          setTargetLabel(s.groupTarget((data as { name: string } | null)?.name ?? '', members.length));
        }
      })();
    }, [navigation, kind, studentId, groupId, s])
  );

  const onSave = async () => {
    const value = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert(s.needAmount);
      return;
    }
    if (!description.trim()) {
      Alert.alert(kind === 'charge' ? s.needChargeReason : s.needPaymentReason);
      return;
    }
    if (!DATE_REGEX.test(entryDate) || toDateKey(parseDateKey(entryDate)) !== entryDate) {
      Alert.alert(s.needDate);
      return;
    }
    if (recipientIds.length === 0) {
      Alert.alert(s.noStudents);
      return;
    }

    const save = async () => {
      setSaving(true);
      try {
        await addBillingEntries(recipientIds, {
          kind,
          amount: Math.round(value * 100) / 100,
          description: description.trim(),
          entryDate,
          method: kind === 'payment' ? method : null,
        });
        navigation.goBack();
      } catch (e) {
        Alert.alert(s.saveFailed, (e as Error).message);
      }
      setSaving(false);
    };

    if (recipientIds.length > 1) {
      Alert.alert(
        s.chargeGroupTitle,
        s.chargeGroupMessage(formatMoney(value), recipientIds.length),
        [
          { text: s.cancel, style: 'cancel' },
          { text: s.charge, onPress: save },
        ]
      );
    } else {
      save();
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.target}>{targetLabel}</Text>

      <TextField
        label={s.amount}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder={s.amountPlaceholder}
      />
      <TextField
        label={kind === 'charge' ? s.forWhat : s.comment}
        value={description}
        onChangeText={setDescription}
        placeholder={kind === 'charge' ? s.chargePlaceholder : s.paymentPlaceholder}
      />
      <TextField label={s.date} value={entryDate} onChangeText={setEntryDate} placeholder="2026-10-01" />

      {kind === 'payment' ? (
        <>
          <Text style={styles.label}>{s.method}</Text>
          <View style={styles.methodRow}>
            {METHODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={[styles.method, method === m && styles.methodActive]}
              >
                <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                  {paymentMethodLabel(m)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Button title={kind === 'charge' ? s.charge : s.savePayment} onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  target: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  methodRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  method: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  methodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  methodTextActive: { color: colors.white },
});
