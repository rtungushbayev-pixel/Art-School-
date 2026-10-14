import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { errorText } from '../lib/errors';
import { TextField } from './TextField';
import { Button } from './Button';
import { useStrings } from '../i18n';
import { colors, spacing } from '../theme/colors';

const STRINGS = {
  ru: {
    title: 'Связь с 1С и Битрикс24',
    onec: 'Код в 1С (договор или контрагент)',
    deal: 'dealId в Битрикс24',
    save: 'Сохранить',
    saved: 'Сохранено',
    badDeal: 'dealId — только цифры',
    failed: 'Не удалось сохранить',
  },
  kk: {
    title: '1С және Битрикс24 байланысы',
    onec: '1С-тегі код (шарт немесе контрагент)',
    deal: 'Битрикс24-тегі dealId',
    save: 'Сақтау',
    saved: 'Сақталды',
    badDeal: 'dealId — тек сандар',
    failed: 'Сақтау мүмкін болмады',
  },
  en: {
    title: '1C and Bitrix24 link',
    onec: 'Code in 1C (contract or counterparty)',
    deal: 'dealId in Bitrix24',
    save: 'Save',
    saved: 'Saved',
    badDeal: 'dealId must contain digits only',
    failed: 'Could not save',
  },
};

// Только для администратора: внешние коды ученика (1С и Битрикс24).
// Открывается из списка учеников в карточке группы.
export function ExternalIdsEditor({ rosterId }: { rosterId: string }) {
  const s = useStrings(STRINGS);
  const [loaded, setLoaded] = useState(false);
  const [onec, setOnec] = useState('');
  const [deal, setDeal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('school_roster')
      .select('id, onec_code, bitrix_deal_id')
      .eq('id', rosterId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { id: string; onec_code: string | null; bitrix_deal_id: number | null } | null;
        setOnec(row?.onec_code ?? '');
        setDeal(row?.bitrix_deal_id ? String(row.bitrix_deal_id) : '');
        setLoaded(true);
      });
  }, [rosterId]);

  if (!loaded) return null;

  const onSave = async () => {
    if (deal.trim() && !/^\d{1,15}$/.test(deal.trim())) {
      Alert.alert(s.badDeal);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('school_roster')
      .update({ onec_code: onec.trim() || null, bitrix_deal_id: deal.trim() ? Number(deal.trim()) : null })
      .eq('id', rosterId);
    setSaving(false);
    if (error) Alert.alert(s.failed, errorText(error));
    else Alert.alert(s.saved);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{s.title}</Text>
      <TextField label={s.onec} value={onec} onChangeText={setOnec} maxLength={50} autoCapitalize="none" />
      <TextField label={s.deal} value={deal} onChangeText={setDeal} keyboardType="number-pad" maxLength={15} />
      <Button title={s.save} variant="secondary" onPress={onSave} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  title: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
});
