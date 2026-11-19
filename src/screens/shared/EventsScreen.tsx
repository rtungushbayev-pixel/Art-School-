import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { isStaffRole } from '../../lib/roles';
import { localISODate } from '../../lib/attendance';
import { eventDates, eventKindLabel, fetchEvents, fetchParticipantCounts, type SchoolEvent } from '../../lib/events';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    create: '+ Новое событие',
    upcoming: 'Скоро',
    past: 'Прошедшие',
    empty: 'Пока нет запланированных выставок и конкурсов',
    participants: (n: number, max: number | null) => (max ? `записано ${n} из ${max}` : `записано ${n}`),
  },
  kk: {
    create: '+ Жаңа іс-шара',
    upcoming: 'Жақында',
    past: 'Өткендер',
    empty: 'Әзірге жоспарланған көрмелер мен байқаулар жоқ',
    participants: (n: number, max: number | null) => (max ? `${max} ішінен ${n} жазылды` : `${n} жазылды`),
  },
  en: {
    create: '+ New event',
    upcoming: 'Upcoming',
    past: 'Past',
    empty: 'No exhibitions or competitions planned yet',
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
  const upcoming = events.filter((e) => (e.ends_on ?? e.starts_on) >= today);
  const past = events.filter((e) => (e.ends_on ?? e.starts_on) < today).reverse();

  const card = (e: SchoolEvent) => (
    <Pressable key={e.id} onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}>
      <Card>
        <Text style={styles.kind}>{eventKindLabel(e.kind)}</Text>
        <Text style={styles.title}>{e.title}</Text>
        <Text style={styles.meta}>
          {eventDates(e)}
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
      {events.length === 0 && !loading ? <Text style={styles.empty}>{s.empty}</Text> : null}
      {upcoming.length > 0 ? <Text style={styles.section}>{s.upcoming}</Text> : null}
      {upcoming.map(card)}
      {past.length > 0 ? <Text style={styles.section}>{s.past}</Text> : null}
      {past.map(card)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  create: { marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  kind: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});
