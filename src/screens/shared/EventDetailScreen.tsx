import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { isStaffRole } from '../../lib/roles';
import { errorText } from '../../lib/errors';
import { fetchChildren } from '../../lib/parents';
import { localISODate } from '../../lib/attendance';
import {
  deleteEvent,
  eventDates,
  eventKindLabel,
  fetchEvent,
  fetchParticipantCounts,
  fetchRegistrations,
  formatEventDate,
  register,
  unregister,
  type Registration,
  type SchoolEvent,
} from '../../lib/events';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    notFound: 'Событие не найдено',
    signupUntil: (d: string) => `Запись до ${d}`,
    places: (n: number, max: number | null) => (max ? `Записано ${n} из ${max}` : `Записано ${n}`),
    signUp: 'Записаться',
    signUpChild: (name: string) => `Записать: ${name}`,
    cancelSignUp: 'Отменить запись',
    cancelChild: (name: string) => `Отменить запись: ${name}`,
    signedUp: 'Вы записаны',
    closed: 'Запись закрыта',
    full: 'Мест больше нет',
    participants: 'Участники',
    noParticipants: 'Пока никто не записался',
    edit: 'Изменить',
    delete: 'Удалить событие',
    deleteQ: 'Удалить событие?',
    cancel: 'Отмена',
    failed: 'Не получилось',
  },
  kk: {
    notFound: 'Іс-шара табылмады',
    signupUntil: (d: string) => `${d} дейін жазылу`,
    places: (n: number, max: number | null) => (max ? `${max} ішінен ${n} жазылды` : `${n} жазылды`),
    signUp: 'Жазылу',
    signUpChild: (name: string) => `Жазу: ${name}`,
    cancelSignUp: 'Жазылудан бас тарту',
    cancelChild: (name: string) => `Жазылудан бас тарту: ${name}`,
    signedUp: 'Сіз жазылдыңыз',
    closed: 'Жазылу жабық',
    full: 'Орын қалмады',
    participants: 'Қатысушылар',
    noParticipants: 'Әзірге ешкім жазылмаған',
    edit: 'Өзгерту',
    delete: 'Іс-шараны жою',
    deleteQ: 'Іс-шараны жою керек пе?',
    cancel: 'Бас тарту',
    failed: 'Болмады',
  },
  en: {
    notFound: 'Event not found',
    signupUntil: (d: string) => `Sign-up until ${d}`,
    places: (n: number, max: number | null) => (max ? `${n} of ${max} signed up` : `${n} signed up`),
    signUp: 'Sign up',
    signUpChild: (name: string) => `Sign up: ${name}`,
    cancelSignUp: 'Cancel sign-up',
    cancelChild: (name: string) => `Cancel sign-up: ${name}`,
    signedUp: 'You are signed up',
    closed: 'Sign-up closed',
    full: 'No places left',
    participants: 'Participants',
    noParticipants: 'Nobody has signed up yet',
    edit: 'Edit',
    delete: 'Delete event',
    deleteQ: 'Delete this event?',
    cancel: 'Cancel',
    failed: 'Failed',
  },
};

export function EventDetailScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'EventDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const { eventId } = route.params;
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [event, setEvent] = useState<SchoolEvent | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [count, setCount] = useState(0);
  const [children, setChildren] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [e, regs, counts, kids] = await Promise.all([
        fetchEvent(eventId),
        fetchRegistrations(eventId),
        fetchParticipantCounts([eventId]),
        profile.role === 'parent' ? fetchChildren(profile.id) : Promise.resolve([] as Profile[]),
      ]);
      setEvent(e);
      setRegistrations(regs);
      setCount(counts[eventId] ?? 0);
      setChildren(kids);
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, [eventId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;
  if (!event) {
    return <Screen scroll refreshing={loading} onRefresh={load}>{!loading ? <Text style={styles.empty}>{s.notFound}</Text> : null}</Screen>;
  }

  const isStaff = isStaffRole(profile.role);
  const closed = (event.signup_until ?? event.starts_on) < localISODate(new Date());
  const full = event.max_participants !== null && count >= event.max_participants;
  const registered = new Set(registrations.map((r) => r.student_id));

  const toggle = async (studentId: string) => {
    setBusy(studentId);
    try {
      if (registered.has(studentId)) await unregister(event.id, studentId);
      else await register(event.id, studentId);
      await load();
    } catch (e) {
      const t = errorText(e) ?? '';
      Alert.alert(s.failed, t.includes('signup_closed') ? s.closed : t.includes('event_full') ? s.full : t);
    }
    setBusy(null);
  };

  // Кого может записать текущий пользователь: себя (ученик) или детей (родитель).
  const people: { id: string; name: string | null }[] =
    profile.role === 'student'
      ? [{ id: profile.id, name: null }]
      : profile.role === 'parent'
        ? children.map((c) => ({ id: c.id, name: c.full_name }))
        : [];

  const onDelete = () => {
    Alert.alert(s.deleteQ, event.title, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(event.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert(s.failed, errorText(e));
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.kind}>{eventKindLabel(event.kind)}</Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.meta}>
        {eventDates(event)}
        {event.location ? ` · ${event.location}` : ''}
      </Text>
      <Text style={styles.meta}>
        {s.places(count, event.max_participants)}
        {!closed ? ` · ${s.signupUntil(formatEventDate(event.signup_until ?? event.starts_on))}` : ` · ${s.closed}`}
      </Text>
      {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

      {people.map((p) => {
        const on = registered.has(p.id);
        if (!on && (closed || full)) return null;
        return (
          <View key={p.id} style={styles.action}>
            {on && !p.name ? <Text style={styles.signed}>{s.signedUp}</Text> : null}
            <Button
              title={on ? (p.name ? s.cancelChild(p.name) : s.cancelSignUp) : p.name ? s.signUpChild(p.name) : s.signUp}
              variant={on ? 'secondary' : 'primary'}
              loading={busy === p.id}
              disabled={busy !== null}
              onPress={() => toggle(p.id)}
            />
          </View>
        );
      })}
      {people.length > 0 && (closed || full) && !people.some((p) => registered.has(p.id)) ? (
        <Text style={styles.signed}>{closed ? s.closed : s.full}</Text>
      ) : null}

      {isStaff ? (
        <>
          <Text style={styles.section}>{s.participants}</Text>
          {registrations.length === 0 ? <Text style={styles.emptyLeft}>{s.noParticipants}</Text> : null}
          {registrations.length > 0 ? (
            <Card>
              {registrations.map((r, i) => (
                <Text key={r.student_id} style={styles.participant}>
                  {i + 1}. {r.student?.full_name ?? ''}
                </Text>
              ))}
            </Card>
          ) : null}
          <View style={styles.action}>
            <Button title={s.edit} variant="secondary" onPress={() => navigation.navigate('EditEvent', { eventId: event.id })} />
          </View>
          <Button title={s.delete} variant="danger" onPress={onDelete} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  emptyLeft: { color: colors.textMuted, marginBottom: spacing.md },
  kind: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
  description: { color: colors.text, lineHeight: 22, marginTop: spacing.md },
  action: { marginTop: spacing.md },
  signed: { color: colors.success, fontWeight: '700', textAlign: 'center', marginTop: spacing.md },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  participant: { color: colors.text, paddingVertical: 3 },
});
