import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { fetchGroupMembers } from '../../lib/groups';
import { PAYMENT_METHOD_LABELS, addBillingEntries, formatMoney } from '../../lib/payments';
import { parseDateKey, toDateKey } from '../../lib/schedule';
import { colors, radius, spacing } from '../../theme/colors';
import type { PaymentMethod } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

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

  const [targetLabel, setTargetLabel] = useState('');
  const [recipientIds, setRecipientIds] = useState<string[]>(studentId ? [studentId] : []);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(toDateKey(new Date()));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: kind === 'charge' ? 'Начисление' : 'Оплата' });
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
          setTargetLabel(`Группа «${(data as { name: string } | null)?.name ?? ''}» · учеников: ${members.length}`);
        }
      })();
    }, [navigation, kind, studentId, groupId])
  );

  const onSave = async () => {
    const value = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Укажите сумму больше нуля');
      return;
    }
    if (!description.trim()) {
      Alert.alert(kind === 'charge' ? 'Укажите, за что начисление' : 'Укажите, за что оплата');
      return;
    }
    if (!DATE_REGEX.test(entryDate) || toDateKey(parseDateKey(entryDate)) !== entryDate) {
      Alert.alert('Укажите дату в формате ГГГГ-ММ-ДД');
      return;
    }
    if (recipientIds.length === 0) {
      Alert.alert('В группе нет учеников');
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
        Alert.alert('Не удалось сохранить', (e as Error).message);
      }
      setSaving(false);
    };

    if (recipientIds.length > 1) {
      Alert.alert(
        'Начислить всей группе?',
        `${formatMoney(value)} каждому из ${recipientIds.length} учеников`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Начислить', onPress: save },
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
        label="Сумма, ₸"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Например: 25000"
      />
      <TextField
        label={kind === 'charge' ? 'За что' : 'Комментарий'}
        value={description}
        onChangeText={setDescription}
        placeholder={kind === 'charge' ? 'Например: Октябрь, живопись' : 'Например: Оплата за октябрь'}
      />
      <TextField label="Дата (ГГГГ-ММ-ДД)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-10-01" />

      {kind === 'payment' ? (
        <>
          <Text style={styles.label}>Способ оплаты</Text>
          <View style={styles.methodRow}>
            {METHODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={[styles.method, method === m && styles.methodActive]}
              >
                <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                  {PAYMENT_METHOD_LABELS[m]}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Button title={kind === 'charge' ? 'Начислить' : 'Сохранить оплату'} onPress={onSave} loading={saving} />
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
