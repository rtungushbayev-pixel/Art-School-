import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { errorText } from '../../lib/errors';
import { isOfficeRole } from '../../lib/roles';
import {
  cancelMaterialRequest,
  decideMaterialRequest,
  fetchMaterialRequest,
  formatMaterialDate,
  formatQuantity,
  materialStatusLabel,
  materialUnitLabel,
  type MaterialRequestWithTeacher,
} from '../../lib/materials';
import { MATERIAL_STATUS_COLORS } from './MaterialRequestsScreen';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { MaterialRequestStatus } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    notFound: 'Заявка не найдена или уже отменена',
    teacher: 'Преподаватель',
    asked: 'Запрошено',
    issued: 'Выдано',
    created: 'Создана',
    decided: 'Решение',
    comment: 'Комментарий',
    officeNote: 'Ответ Администрации',
    issuedQuantity: 'Сколько выдано',
    note: 'Ответ преподавателю (необязательно)',
    notePlaceholder: 'Например: заберите в кабинете 12',
    markIssued: 'Выдано',
    reject: 'Отклонить',
    reopen: 'Вернуть в новые',
    cancel: 'Отменить заявку',
    cancelQ: 'Отменить заявку?',
    yes: 'Да',
    no: 'Нет',
    badQuantity: 'Укажите количество числом больше нуля',
    failed: 'Не удалось сохранить',
  },
  kk: {
    notFound: 'Өтінім табылмады немесе тоқтатылды',
    teacher: 'Мұғалім',
    asked: 'Сұралды',
    issued: 'Берілді',
    created: 'Құрылды',
    decided: 'Шешім',
    comment: 'Түсініктеме',
    officeNote: 'Әкімшілік жауабы',
    issuedQuantity: 'Қанша берілді',
    note: 'Мұғалімге жауап (міндетті емес)',
    notePlaceholder: 'Мысалы: 12-кабинеттен алыңыз',
    markIssued: 'Берілді',
    reject: 'Қабылдамау',
    reopen: 'Жаңаларға қайтару',
    cancel: 'Өтінімді тоқтату',
    cancelQ: 'Өтінімді тоқтату керек пе?',
    yes: 'Иә',
    no: 'Жоқ',
    badQuantity: 'Нөлден үлкен санды көрсетіңіз',
    failed: 'Сақтау мүмкін болмады',
  },
  en: {
    notFound: 'Request not found or already cancelled',
    teacher: 'Teacher',
    asked: 'Requested',
    issued: 'Issued',
    created: 'Created',
    decided: 'Decision',
    comment: 'Comment',
    officeNote: 'Administration reply',
    issuedQuantity: 'Quantity issued',
    note: 'Reply to the teacher (optional)',
    notePlaceholder: 'For example: pick up in room 12',
    markIssued: 'Issued',
    reject: 'Reject',
    reopen: 'Move back to new',
    cancel: 'Cancel request',
    cancelQ: 'Cancel this request?',
    yes: 'Yes',
    no: 'No',
    badQuantity: 'Please enter a quantity greater than zero',
    failed: 'Could not save',
  },
};

export function MaterialRequestScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<StaffStackParamList, 'MaterialRequest'>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const isOffice = isOfficeRole(profile?.role);
  const [request, setRequest] = useState<MaterialRequestWithTeacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuedQuantity, setIssuedQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<MaterialRequestStatus | 'cancel' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchMaterialRequest(route.params.requestId);
      setRequest(r);
      if (r) {
        setIssuedQuantity(formatQuantity(r.issued_quantity ?? r.quantity));
        setNote(r.office_note ?? '');
      }
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, [route.params.requestId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!request) {
    return (
      <Screen scroll refreshing={loading} onRefresh={load}>
        {!loading ? <Text style={styles.empty}>{s.notFound}</Text> : null}
      </Screen>
    );
  }

  const unit = materialUnitLabel(request.unit);

  const decide = async (status: MaterialRequestStatus) => {
    let qty: number | null = null;
    if (status === 'issued') {
      qty = Number(issuedQuantity.replace(',', '.').trim());
      if (!Number.isFinite(qty) || qty <= 0 || qty > 100000) {
        Alert.alert(s.badQuantity);
        return;
      }
      qty = Math.round(qty * 100) / 100;
    }
    setSaving(status);
    try {
      await decideMaterialRequest(request.id, status, qty, note.trim() || null);
      navigation.goBack();
    } catch (e) {
      setSaving(null);
      Alert.alert(s.failed, errorText(e));
    }
  };

  const onCancel = () => {
    Alert.alert(s.cancelQ, request.material, [
      { text: s.no, style: 'cancel' },
      {
        text: s.yes,
        style: 'destructive',
        onPress: async () => {
          setSaving('cancel');
          try {
            await cancelMaterialRequest(request.id);
            navigation.goBack();
          } catch (e) {
            setSaving(null);
            Alert.alert(s.failed, errorText(e));
          }
        },
      },
    ]);
  };

  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    ) : null;

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.title}>{request.material}</Text>
      <Text style={[styles.status, { color: MATERIAL_STATUS_COLORS[request.status] }]}>
        {materialStatusLabel(request.status)}
      </Text>
      <Card>
        {isOffice ? row(s.teacher, request.teacher?.full_name) : null}
        {row(s.asked, `${formatQuantity(request.quantity)} ${unit}`)}
        {request.status === 'issued' && request.issued_quantity !== null
          ? row(s.issued, `${formatQuantity(request.issued_quantity)} ${unit}`)
          : null}
        {row(s.created, formatMaterialDate(request.created_at))}
        {request.decided_at ? row(s.decided, formatMaterialDate(request.decided_at)) : null}
        {row(s.comment, request.comment)}
        {!isOffice ? row(s.officeNote, request.office_note) : null}
      </Card>

      {isOffice ? (
        <>
          <View style={{ height: spacing.md }} />
          <TextField
            label={`${s.issuedQuantity}, ${unit}`}
            value={issuedQuantity}
            onChangeText={setIssuedQuantity}
            keyboardType="decimal-pad"
            maxLength={9}
          />
          <TextField
            label={s.note}
            placeholder={s.notePlaceholder}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
          />
          <Button
            title={s.markIssued}
            onPress={() => decide('issued')}
            loading={saving === 'issued'}
            disabled={saving !== null}
          />
          <View style={{ height: spacing.sm }} />
          {request.status !== 'rejected' ? (
            <Button
              title={s.reject}
              variant="danger"
              onPress={() => decide('rejected')}
              loading={saving === 'rejected'}
              disabled={saving !== null}
            />
          ) : null}
          {request.status !== 'pending' ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button
                title={s.reopen}
                variant="secondary"
                onPress={() => decide('pending')}
                loading={saving === 'pending'}
                disabled={saving !== null}
              />
            </>
          ) : null}
        </>
      ) : request.status === 'pending' && request.teacher_id === profile?.id ? (
        <>
          <View style={{ height: spacing.md }} />
          <Button title={s.cancel} variant="danger" onPress={onCancel} loading={saving === 'cancel'} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  status: { fontSize: 15, fontWeight: '700', marginTop: spacing.xs, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  rowLabel: { color: colors.textMuted },
  rowValue: { flexShrink: 1, textAlign: 'right', color: colors.text, fontWeight: '600' },
});
