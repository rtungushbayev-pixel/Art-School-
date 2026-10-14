import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { errorText } from '../lib/errors';
import { sendPushNotification } from '../lib/notifications';
import {
  decideGroupRequest,
  fetchGroupTeacherRequests,
  requestGroupTakeover,
  type GroupTeacherRequest,
} from '../lib/groups';
import { useStrings } from '../i18n';
import { colors, spacing } from '../theme/colors';

const STRINGS = {
  ru: {
    request: 'Заменить преподавателя',
    requestQ: 'Заменить преподавателя?',
    requestText: 'Администратор получит запрос. После одобрения группа перейдёт к вам.',
    send: 'Отправить',
    cancel: 'Отмена',
    pending: 'Запрос на замену отправлен. Ждёт решения администратора.',
    asks: (name: string) => `${name} просит взять группу`,
    approve: 'Одобрить',
    reject: 'Отклонить',
    failed: 'Не получилось',
  },
  kk: {
    request: 'Мұғалімді ауыстыру',
    requestQ: 'Мұғалімді ауыстыру керек пе?',
    requestText: 'Әкімші сұраныс алады. Мақұлданғаннан кейін топ сізге өтеді.',
    send: 'Жіберу',
    cancel: 'Бас тарту',
    pending: 'Ауыстыру сұранысы жіберілді. Әкімшінің шешімін күтуде.',
    asks: (name: string) => `${name} топты алуды сұрайды`,
    approve: 'Мақұлдау',
    reject: 'Қабылдамау',
    failed: 'Болмады',
  },
  en: {
    request: 'Replace the teacher',
    requestQ: 'Replace the teacher?',
    requestText: 'The administrator gets a request. Once approved, the group moves to you.',
    send: 'Send',
    cancel: 'Cancel',
    pending: 'Replacement request sent. Waiting for the administrator.',
    asks: (name: string) => `${name} asks to take the group`,
    approve: 'Approve',
    reject: 'Reject',
    failed: 'Failed',
  },
};

// Замена преподавателя группы. Преподаватель (не ведущий эту группу) просит
// взять её, администратор одобряет или отклоняет (миграция 0045).
export function GroupTeacherRequests({
  groupId,
  mode,
  onDecided,
}: {
  groupId: string;
  mode: 'teacher' | 'admin';
  onDecided?: () => void;
}) {
  const s = useStrings(STRINGS);
  const [requests, setRequests] = useState<GroupTeacherRequest[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchGroupTeacherRequests(groupId)
      .then(setRequests)
      .catch(() => {});
  }, [groupId]);

  useEffect(load, [load]);

  const request = () => {
    Alert.alert(s.requestQ, s.requestText, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.send,
        onPress: async () => {
          setBusy(true);
          try {
            const id = await requestGroupTakeover(groupId);
            sendPushNotification({ event: 'group_request', id });
            load();
          } catch (e) {
            Alert.alert(s.failed, errorText(e));
          }
          setBusy(false);
        },
      },
    ]);
  };

  const decide = async (r: GroupTeacherRequest, approve: boolean) => {
    setBusy(true);
    try {
      await decideGroupRequest(r.id, approve);
      sendPushNotification({ event: 'group_request_decided', id: r.id });
      if (approve) {
        // Остальные запросы по группе отклонены сервером — сообщаем и их авторам.
        requests
          .filter((other) => other.id !== r.id)
          .forEach((other) => sendPushNotification({ event: 'group_request_decided', id: other.id }));
      }
      load();
      onDecided?.();
    } catch (e) {
      Alert.alert(s.failed, errorText(e));
    }
    setBusy(false);
  };

  if (mode === 'teacher') {
    if (requests.length > 0) return <Text style={styles.pending}>{s.pending}</Text>;
    return (
      <View style={styles.wrapper}>
        <Button title={s.request} variant="secondary" onPress={request} loading={busy} />
      </View>
    );
  }

  if (requests.length === 0) return null;
  return (
    <View style={styles.wrapper}>
      {requests.map((r) => (
        <Card key={r.id}>
          <Text style={styles.asks}>{s.asks(r.requester?.full_name ?? '')}</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Button title={s.approve} onPress={() => decide(r, true)} disabled={busy} />
            </View>
            <View style={styles.half}>
              <Button title={s.reject} variant="secondary" onPress={() => decide(r, false)} disabled={busy} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.md },
  pending: { color: colors.textMuted, marginTop: spacing.md, fontSize: 13 },
  asks: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
