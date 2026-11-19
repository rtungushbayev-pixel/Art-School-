import React, { useCallback, useState } from 'react';
import { isStaffRole } from '../../lib/roles';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchSupportTickets,
  supportCategories,
  supportCategoryLabel,
  supportStatusLabel,
  formatSupportDate,
  type SupportTicketWithAuthor,
} from '../../lib/support';
import { useStrings } from '../../i18n';
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

const STRINGS = {
  ru: {
    filterActive: 'Ждут ответа',
    filterAll: 'Все',
    filterMine: 'Мои',
    introTitle: 'С чем нужна помощь?',
    introText: 'Выберите тему. Администрация школы ответит здесь же, а вам придёт уведомление.',
    myTickets: 'Мои обращения',
    noTickets: 'Обращений нет',
    neverContacted: 'Вы ещё не обращались в поддержку',
    noName: 'Без имени',
  },
  kk: {
    filterActive: 'Жауап күтуде',
    filterAll: 'Барлығы',
    filterMine: 'Менікі',
    introTitle: 'Қандай көмек керек?',
    introText: 'Тақырыпты таңдаңыз. Мектеп әкімшілігі осы жерде жауап береді, ал сізге хабарлама келеді.',
    myTickets: 'Менің өтініштерім',
    noTickets: 'Өтініштер жоқ',
    neverContacted: 'Сіз әлі қолдау қызметіне жүгінбегенсіз',
    noName: 'Аты жоқ',
  },
  en: {
    filterActive: 'Awaiting reply',
    filterAll: 'All',
    filterMine: 'Mine',
    introTitle: 'What do you need help with?',
    introText: 'Choose a topic. The school administration will reply right here, and you’ll get a notification.',
    myTickets: 'My requests',
    noTickets: 'No requests',
    neverContacted: 'You haven’t contacted support yet',
    noName: 'No name',
  },
};


// Ученик видит свои обращения, сотрудник — обращения всех пользователей.
export function SupportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const isStaff = isStaffRole(profile?.role);
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
          {([
            { value: 'active', label: s.filterActive },
            { value: 'all', label: s.filterAll },
            { value: 'mine', label: s.filterMine },
          ] as { value: Filter; label: string }[]).map((opt) => (
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
        <>
          <Text style={styles.introTitle}>{s.introTitle}</Text>
          <Text style={styles.introText}>
            {s.introText}
          </Text>
          {supportCategories().map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => navigation.navigate('NewSupportTicket', { category: opt.value })}
            >
              <Card style={styles.topic}>
                <View style={styles.topicIcon}>
                  <Ionicons name={opt.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.primary} />
                </View>
                <View style={styles.topicText}>
                  <Text style={styles.topicTitle}>{supportCategoryLabel(opt.value)}</Text>
                  <Text style={styles.topicHint}>{opt.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Card>
            </Pressable>
          ))}
          {tickets.length > 0 ? <Text style={styles.sectionTitle}>{s.myTickets}</Text> : null}
        </>
      )}

      {visible.length === 0 && !loading && isStaff ? (
        <Text style={styles.empty}>{isStaff ? s.noTickets : s.neverContacted}</Text>
      ) : null}

      {visible.map((ticket) => (
        <Pressable key={ticket.id} onPress={() => navigation.navigate('SupportTicket', { ticketId: ticket.id })}>
          <Card>
            <View style={styles.headerRow}>
              {isStaff ? (
                <>
                  <Avatar uri={ticket.author?.avatar_url} name={ticket.author?.full_name} size={28} />
                  <Text style={styles.author} numberOfLines={1}>
                    {ticket.author?.full_name || s.noName}
                  </Text>
                </>
              ) : (
                <Text style={styles.category}>{supportCategoryLabel(ticket.category)}</Text>
              )}
              <Text style={[styles.status, { color: STATUS_COLORS[ticket.status] }]}>
                {supportStatusLabel(ticket.status)}
              </Text>
            </View>
            <Text style={styles.subject} numberOfLines={2}>
              {ticket.subject}
            </Text>
            <Text style={styles.meta}>
              {isStaff ? `${supportCategoryLabel(ticket.category)} · ` : ''}
              {formatSupportDate(ticket.last_message_at)}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  introTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  introText: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  topic: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topicIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  topicText: { flex: 1 },
  topicTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  topicHint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
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
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  author: { flex: 1, fontWeight: '600', color: colors.text },
  category: { flex: 1, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  status: { fontSize: 13, fontWeight: '700' },
  subject: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
