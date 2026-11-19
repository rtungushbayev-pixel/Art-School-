import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { errorText } from '../../lib/errors';
import { createMaterialRequest, MATERIAL_UNITS, materialUnitLabel } from '../../lib/materials';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { MaterialUnit } from '../../types/database';

const STRINGS = {
  ru: {
    title: 'Какие материалы нужны?',
    material: 'Материал',
    materialPlaceholder: 'Например: гуашь 12 цветов, бумага А3',
    quantity: 'Количество',
    unit: 'Единица',
    comment: 'Комментарий (необязательно)',
    commentPlaceholder: 'Для какой группы, к какому сроку',
    send: 'Отправить заявку',
    needMaterial: 'Укажите материал',
    needQuantity: 'Укажите количество числом больше нуля',
    sendFailed: 'Не удалось отправить',
    tooMany: 'Слишком много заявок за сутки. Попробуйте завтра.',
  },
  kk: {
    title: 'Қандай материалдар керек?',
    material: 'Материал',
    materialPlaceholder: 'Мысалы: 12 түсті гуашь, А3 қағаз',
    quantity: 'Саны',
    unit: 'Өлшем бірлігі',
    comment: 'Түсініктеме (міндетті емес)',
    commentPlaceholder: 'Қай топқа, қай мерзімге',
    send: 'Өтінім жіберу',
    needMaterial: 'Материалды көрсетіңіз',
    needQuantity: 'Нөлден үлкен санды көрсетіңіз',
    sendFailed: 'Жіберу мүмкін болмады',
    tooMany: 'Бір тәулікте тым көп өтінім. Ертең қайталаңыз.',
  },
  en: {
    title: 'What supplies do you need?',
    material: 'Item',
    materialPlaceholder: 'For example: gouache 12 colours, A3 paper',
    quantity: 'Quantity',
    unit: 'Unit',
    comment: 'Comment (optional)',
    commentPlaceholder: 'Which group, by when',
    send: 'Send request',
    needMaterial: 'Please enter the item',
    needQuantity: 'Please enter a quantity greater than zero',
    sendFailed: 'Could not send',
    tooMany: 'Too many requests today. Please try again tomorrow.',
  },
};

export function NewMaterialRequestScreen() {
  const navigation = useNavigation();
  const s = useStrings(STRINGS);
  const [material, setMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<MaterialUnit>('pcs');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const onSend = async () => {
    const name = material.trim();
    const qty = Number(quantity.replace(',', '.').trim());
    if (!name) {
      Alert.alert(s.needMaterial);
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100000) {
      Alert.alert(s.needQuantity);
      return;
    }
    setSaving(true);
    try {
      await createMaterialRequest({
        material: name,
        quantity: Math.round(qty * 100) / 100,
        unit,
        comment: comment.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      const text = errorText(e);
      Alert.alert(s.sendFailed, text?.includes('rate_limited') ? s.tooMany : text);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{s.title}</Text>
      <TextField
        label={s.material}
        placeholder={s.materialPlaceholder}
        value={material}
        onChangeText={setMaterial}
        maxLength={200}
      />
      <TextField
        label={s.quantity}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        maxLength={9}
      />
      <Text style={styles.label}>{s.unit}</Text>
      <View style={styles.units}>
        {MATERIAL_UNITS.map((value) => (
          <Pressable
            key={value}
            onPress={() => setUnit(value)}
            style={[styles.unit, unit === value && styles.unitActive]}
          >
            <Text style={[styles.unitText, unit === value && styles.unitTextActive]}>{materialUnitLabel(value)}</Text>
          </Pressable>
        ))}
      </View>
      <TextField
        label={s.comment}
        placeholder={s.commentPlaceholder}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        maxLength={1000}
        style={styles.textarea}
      />
      <Button title={s.send} onPress={onSend} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  unit: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  unitActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  unitTextActive: { color: colors.white },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
});
