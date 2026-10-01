import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  fetchSupportTickets,
  formatSupportDate,
  type SupportTicketWithAuthor,
} from '../../lib/support';
import { colors, radius, spacing } from '../../theme/colors';
import type { SupportStatus } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STATUS_COLORS: Record<SupportStatus, string> = {
  open: colors.warning,
  answered: colors.success,
  closed: colors.textMuted,
};

type Filter = 'active' | 'all' | 'mine';

const STAFF_FILTERS: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Ждут ответа' },
  { value: 'all', label: 'Все' },
  { value: 'mine', label: 'Мои' },
];

// Ученик видит свои обращения, сотрудник — обращения всех пользователей.
export function SupportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const isStaff = profile?.role === 'staff';
  const [tickets, setTickets] = useState<SupportTicketWithAuthor[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setTickets(await fetchSupportTickets(isStaff ? undefined : profile.id));
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, [profile, isStaff]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;

  const visible = !isStaff
    ? tickets
    : tickets.filter((t) =>
        filter === 'active' ? t.status === 'open' : filter === 'mine' ? t.author_id === profile.id : true
      );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {isStaff ? (
        <View style={styles.filterRow}>
          {STAFF_FILTERS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setFilter(opt.value)}
              style={[styles.filterOption, filter === opt.value && styles.filterOptionActive]}
            >
              <Text style={[styles.filterText, filter === opt.value && styles.filterTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.introTitle}>Нужна помощь?</Text>
          <Text style={styles.introText}>
            Опишите проблему или вопрос — администрация школы ответит здесь же, а вам придёт уведомление.
          </Text>
        </Card>
      )}

      <Button title="Новое обращение" onPress={() => navigation.navigate('NewSupportTicket')} />
      <View style={{ height: spacing.md }} />

      {visible.length === 0 && !loading ? (
        <Text style={styles.empty}>{isStaff ? 'Обращений нет' : 'Вы ещё не обращались в поддержку'}</Text>
      ) : null}

      {visible.map((ticket) => (
        <Pressable key={ticket.id} onPress={() => navigation.navigate('SupportTicket', { ticketId: ticket.id })}>
          <Card>
            <View style={styles.headerRow}>
              {isStaff ? (
                <>
                  <Avatar uri={ticket.author?.avatar_url} name={ticket.author?.full_name} size={28} />
                  <Text style={styles.author} numberOfLines={1}>
                    {ticket.author?.full_name || 'Без имени'}
                  </Text>
                </>
              ) : (
                <Text style={styles.category}>{SUPPORT_CATEGORY_LABELS[ticket.category]}</Text>
              )}
              <Text style={[styles.status, { color: STATUS_COLORS[ticket.status] }]}>
                {SUPPORT_STATUS_LABELS[ticket.status]}
              </Text>
            </View>
            <Text style={styles.subject} numberOfLines={2}>
              {ticket.subject}
            </Text>
            <Text style={styles.meta}>
              {isStaff ? `${SUPPORT_CATEGORY_LABELS[ticket.category]} · ` : ''}
              {formatSupportDate(ticket.last_message_at)}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  introTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  introText: { color: colors.textMuted, lineHeight: 20 },
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
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  author: { flex: 1, fontWeight: '600', color: colors.text },
  category: { flex: 1, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  status: { fontSize: 13, fontWeight: '700' },
  subject: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
