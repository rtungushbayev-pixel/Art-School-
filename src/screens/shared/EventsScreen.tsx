import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { isStaffRole } from '../../lib/roles';
import { localISODate } from '../../lib/attendance';
import {
  eventDates,
  eventDeadline,
  eventKindLabel,
  eventLevelLabel,
  EVENT_LEVELS,
  fetchEvents,
  matchesEventQuery,
  type EventLevel,
  fetchParticipantCounts,
  type SchoolEvent,
} from '../../lib/events';
import { DeadlineBadge, DeadlineLine } from '../../components/EventDeadline';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    create: '+ Новое событие',
    upcoming: 'Скоро',
    past: 'Прошедшие',
    dates: (d: string) => `Проходит: ${d}`,
    empty: 'Пока нет запланированных выставок и конкурсов',
    search: 'Поиск конкурса',
    all: 'Все',
    notFound: 'Ничего не найдено',
    participants: (n: number, max: number | null) => (max ? `записано ${n} из ${max}` : `записано ${n}`),
  },
  kk: {
    create: '+ Жаңа іс-шара',
    upcoming: 'Жақында',
    past: 'Өткендер',
    dates: (d: string) => `Өтетін күні: ${d}`,
    empty: 'Әзірге жоспарланған көрмелер мен байқаулар жоқ',
    search: 'Байқауды іздеу',
    all: 'Барлығы',
    notFound: 'Ештеңе табылмады',
    participants: (n: number, max: number | null) => (max ? `${max} ішінен ${n} жазылды` : `${n} жазылды`),
  },
  en: {
    create: '+ New event',
    upcoming: 'Upcoming',
    past: 'Past',
    dates: (d: string) => `Dates: ${d}`,
    empty: 'No exhibitions or competitions planned yet',
    search: 'Search competitions',
    all: 'All',
    notFound: 'Nothing found',
    participants: (n: number, max: number | null) => (max ? `${n} of ${max} signed up` : `${n} signed up`),
  },
};

// Выставки, конкурсы и мастер-классы школы.
export function EventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<EventLevel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchEvents();
      setEvents(list);
      setCounts(await fetchParticipantCounts(list.map((e) => e.id)));
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const today = localISODate(new Date());
  const filtered = events.filter((e) => (!level || e.level === level) && matchesEventQuery(e, query));
  const searching = query.trim().length > 0 || level !== null;
  // Сверху — то, куда ещё можно успеть: по ближайшему дедлайну.
  const upcoming = filtered
    .filter((e) => (e.ends_on ?? e.starts_on) >= today)
    .sort((a, b) => {
      const aOpen = eventDeadline(a) >= today;
      const bOpen = eventDeadline(b) >= today;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      return eventDeadline(a).localeCompare(eventDeadline(b));
    });
  const past = filtered.filter((e) => (e.ends_on ?? e.starts_on) < today).reverse();

  const card = (e: SchoolEvent) => (
    <Pressable key={e.id} onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}>
      <Card>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.kind}>
              {eventKindLabel(e.kind)}
              {e.level ? ` · ${eventLevelLabel(e.level)}` : ''}
            </Text>
            <Text style={styles.title}>{e.title}</Text>
            <DeadlineLine event={e} />
          </View>
          <DeadlineBadge event={e} />
        </View>
        <Text style={styles.meta}>
          {s.dates(eventDates(e))}
          {e.location ? ` · ${e.location}` : ''}
        </Text>
        <Text style={styles.meta}>{s.participants(counts[e.id] ?? 0, e.max_participants)}</Text>
      </Card>
    </Pressable>
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {isStaffRole(profile?.role) ? (
        <View style={styles.create}>
          <Button title={s.create} onPress={() => navigation.navigate('EditEvent', {})} />
        </View>
      ) : null}
      {events.length > 0 ? (
        <>
          <View style={styles.search}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={s.search}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query ? (
              <Pressable hitSlop={8} onPress={() => setQuery('')} accessibilityLabel="✕">
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chips}>
            {([null, ...EVENT_LEVELS] as (EventLevel | null)[]).map((l) => (
              <Pressable key={l ?? 'all'} onPress={() => setLevel(l)} style={[styles.chip, level === l && styles.chipActive]}>
                <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l ? eventLevelLabel(l) : s.all}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {events.length === 0 && !loading ? <Text style={styles.empty}>{s.empty}</Text> : null}
      {searching && filtered.length === 0 ? <Text style={styles.empty}>{s.notFound}</Text> : null}
      {upcoming.length > 0 ? <Text style={styles.section}>{s.upcoming}</Text> : null}
      {upcoming.map(card)}
      {past.length > 0 ? <Text style={styles.section}>{s.past}</Text> : null}
      {past.map(card)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  create: { marginBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  info: { flex: 1 },
  kind: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});
