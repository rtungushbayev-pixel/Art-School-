import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole, isOfficeRole, isStaffRole } from '../../lib/roles';
import {
  fetchMaterialRequests,
  formatMaterialDate,
  formatQuantity,
  materialStatusLabel,
  materialUnitLabel,
  type MaterialRequestWithTeacher,
} from '../../lib/materials';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { MaterialRequestStatus } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

export const MATERIAL_STATUS_COLORS: Record<MaterialRequestStatus, string> = {
  pending: colors.warning,
  issued: colors.success,
  rejected: colors.danger,
};

const STRINGS = {
  ru: {
    newRequest: 'Новая заявка',
    summary: 'Сводка за период',
    intro: 'Заявки преподавателей на материалы. Откройте заявку, чтобы отметить выдачу.',
    mine: 'Мои заявки',
    empty: 'Заявок нет',
    mineEmpty: 'Вы ещё не отправляли заявок. Нажмите «Новая заявка», чтобы попросить материалы.',
    filters: { pending: 'Новые', issued: 'Выданные', rejected: 'Отклонённые', all: 'Все' },
    issuedOf: (issued: string, asked: string) => `выдано ${issued} из ${asked}`,
  },
  kk: {
    newRequest: 'Жаңа өтінім',
    summary: 'Кезең бойынша жиынтық',
    intro: 'Мұғалімдердің материалдарға өтінімдері. Берілгенін белгілеу үшін өтінімді ашыңыз.',
    mine: 'Менің өтінімдерім',
    empty: 'Өтінімдер жоқ',
    mineEmpty: 'Сіз әлі өтінім жібермегенсіз. Материал сұрау үшін «Жаңа өтінім» түймесін басыңыз.',
    filters: { pending: 'Жаңа', issued: 'Берілген', rejected: 'Қабылданбаған', all: 'Барлығы' },
    issuedOf: (issued: string, asked: string) => `${asked} ішінен ${issued} берілді`,
  },
  en: {
    newRequest: 'New request',
    summary: 'Summary for a period',
    intro: 'Teachers’ supply requests. Open a request to mark it as issued.',
    mine: 'My requests',
    empty: 'No requests',
    mineEmpty: 'You haven’t sent any requests yet. Tap “New request” to ask for supplies.',
    filters: { pending: 'New', issued: 'Issued', rejected: 'Rejected', all: 'All' },
    issuedOf: (issued: string, asked: string) => `${issued} of ${asked} issued`,
  },
};

type Filter = MaterialRequestStatus | 'all';

// Преподаватель видит свои заявки и создаёт новые. Администрация и
// администратор видят все заявки и отмечают выдачу; администратор — ещё сводку.
export function MaterialRequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const isOffice = isOfficeRole(profile?.role);
  const canRequest = isStaffRole(profile?.role);
  const [requests, setRequests] = useState<MaterialRequestWithTeacher[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setRequests(await fetchMaterialRequests(isOffice ? undefined : profile.id));
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, [profile, isOffice]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;

  const visible = isOffice ? requests.filter((r) => filter === 'all' || r.status === filter) : requests;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {canRequest ? (
        <Button title={s.newRequest} onPress={() => navigation.navigate('NewMaterialRequest')} />
      ) : null}
      {isAdminRole(profile.role) ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title={s.summary} variant="secondary" onPress={() => navigation.navigate('MaterialSummary')} />
        </>
      ) : null}

      {isOffice ? (
        <>
          <Text style={styles.intro}>{s.intro}</Text>
          <View style={styles.filterRow}>
            {(['pending', 'issued', 'rejected', 'all'] as Filter[]).map((value) => (
              <Pressable
                key={value}
                onPress={() => setFilter(value)}
                style={[styles.filterOption, filter === value && styles.filterOptionActive]}
              >
                <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                  {s.filters[value]}
                  {value === 'pending' && pendingCount > 0 ? ` · ${pendingCount}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.sectionTitle}>{s.mine}</Text>
      )}

      {visible.length === 0 && !loading ? (
        <Text style={styles.empty}>{isOffice ? s.empty : s.mineEmpty}</Text>
      ) : null}

      {visible.map((r) => {
        const asked = `${formatQuantity(r.quantity)} ${materialUnitLabel(r.unit)}`;
        const partial = r.status === 'issued' && r.issued_quantity !== null && Number(r.issued_quantity) !== Number(r.quantity);
        return (
          <Pressable key={r.id} onPress={() => navigation.navigate('MaterialRequest', { requestId: r.id })}>
            <Card>
              {isOffice ? (
                <View style={styles.headerRow}>
                  <Avatar uri={r.teacher?.avatar_url} name={r.teacher?.full_name} size={28} />
                  <Text style={styles.teacher} numberOfLines={1}>
                    {r.teacher?.full_name ?? ''}
                  </Text>
                  <Text style={[styles.status, { color: MATERIAL_STATUS_COLORS[r.status] }]}>
                    {materialStatusLabel(r.status)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.titleRow}>
                <Text style={styles.material} numberOfLines={2}>
                  {r.material}
                </Text>
                <Text style={styles.quantity}>{asked}</Text>
              </View>
              {r.comment ? (
                <Text style={styles.comment} numberOfLines={2}>
                  {r.comment}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {formatMaterialDate(r.created_at)}
                {!isOffice ? ` · ${materialStatusLabel(r.status)}` : ''}
                {partial ? ` · ${s.issuedOf(formatQuantity(r.issued_quantity as number), asked)}` : ''}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, lineHeight: 20, marginTop: spacing.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: colors.white },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  teacher: { flex: 1, fontWeight: '600', color: colors.text },
  status: { fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  material: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  quantity: { fontSize: 16, fontWeight: '700', color: colors.primary },
  comment: { color: colors.textMuted, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
