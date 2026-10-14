import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { errorText } from '../lib/errors';
import { sendPushNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import {
  canReturnGroup,
  cancelGroupReplacement,
  decideGroupRequest,
  fetchGroupTeacherRequests,
  requestGroupReplacement,
  requestGroupTakeover,
  type GroupTeacherRequest,
} from '../lib/groups';
import { useStrings } from '../i18n';
import { colors, spacing } from '../theme/colors';

const STRINGS = {
  ru: {
    askReplacement: 'Запрос на замену',
    askReplacementQ: 'Запросить замену?',
    askReplacementText:
      'Все преподаватели и администратор получат уведомление. Первый, кто нажмёт «Взять группу», станет её преподавателем. Когда вернётесь, нажмите «Вернуть группу».',
    replacementSent: 'Вы запросили замену. Когда кто-то из преподавателей возьмёт группу, придёт уведомление.',
    cancelReplacement: 'Отменить запрос',
    needsReplacement: (name: string) => `${name} просит замену в этой группе`,
    take: 'Взять группу',
    takeQ: 'Взять группу?',
    takeText: 'Вы станете преподавателем группы: посещаемость и расписание перейдут к вам.',
    taken: 'Группа теперь ваша',
    giveBack: 'Вернуть группу',
    giveBackQ: 'Вернуть группу себе?',
    giveBackText: 'Вы снова станете преподавателем группы.',
    request: 'Заменить преподавателя',
    requestQ: 'Заменить преподавателя?',
    requestText: 'Администратор получит запрос. После одобрения группа перейдёт к вам.',
    send: 'Отправить',
    yes: 'Да',
    cancel: 'Отмена',
    pending: 'Запрос на замену отправлен. Ждёт решения администратора.',
    asks: (name: string) => `${name} просит взять группу`,
    adminReplacement: (name: string) =>
      `${name} просит замену. Любой преподаватель может взять группу сам, или выберите преподавателя выше.`,
    approve: 'Одобрить',
    reject: 'Отклонить',
    failed: 'Не получилось',
  },
  kk: {
    askReplacement: 'Ауыстыру сұранысы',
    askReplacementQ: 'Ауыстыруды сұрау керек пе?',
    askReplacementText:
      'Барлық мұғалімдер мен әкімші хабарлама алады. «Топты алу» түймесін бірінші басқан адам топтың мұғалімі болады. Оралғанда «Топты қайтару» түймесін басыңыз.',
    replacementSent: 'Сіз ауыстыруды сұрадыңыз. Мұғалімдердің бірі топты алғанда хабарлама келеді.',
    cancelReplacement: 'Сұранысты болдырмау',
    needsReplacement: (name: string) => `${name} осы топта ауыстыру сұрайды`,
    take: 'Топты алу',
    takeQ: 'Топты алу керек пе?',
    takeText: 'Сіз топтың мұғалімі боласыз: қатысу мен кесте сізге өтеді.',
    taken: 'Топ енді сіздікі',
    giveBack: 'Топты қайтару',
    giveBackQ: 'Топты өзіңізге қайтару керек пе?',
    giveBackText: 'Сіз қайтадан топтың мұғалімі боласыз.',
    request: 'Мұғалімді ауыстыру',
    requestQ: 'Мұғалімді ауыстыру керек пе?',
    requestText: 'Әкімші сұраныс алады. Мақұлданғаннан кейін топ сізге өтеді.',
    send: 'Жіберу',
    yes: 'Иә',
    cancel: 'Бас тарту',
    pending: 'Ауыстыру сұранысы жіберілді. Әкімшінің шешімін күтуде.',
    asks: (name: string) => `${name} топты алуды сұрайды`,
    adminReplacement: (name: string) =>
      `${name} ауыстыру сұрайды. Кез келген мұғалім топты өзі ала алады немесе жоғарыдан мұғалімді таңдаңыз.`,
    approve: 'Мақұлдау',
    reject: 'Қабылдамау',
    failed: 'Болмады',
  },
  en: {
    askReplacement: 'Request a substitute',
    askReplacementQ: 'Request a substitute?',
    askReplacementText:
      'All teachers and the administrator get a notification. The first one to tap “Take the group” becomes its teacher. When you are back, tap “Take the group back”.',
    replacementSent: 'You requested a substitute. You will be notified when a teacher takes the group.',
    cancelReplacement: 'Cancel the request',
    needsReplacement: (name: string) => `${name} needs a substitute for this group`,
    take: 'Take the group',
    takeQ: 'Take the group?',
    takeText: 'You become the group teacher: attendance and the schedule move to you.',
    taken: 'The group is yours now',
    giveBack: 'Take the group back',
    giveBackQ: 'Take the group back?',
    giveBackText: 'You become the group teacher again.',
    request: 'Replace the teacher',
    requestQ: 'Replace the teacher?',
    requestText: 'The administrator gets a request. Once approved, the group moves to you.',
    send: 'Send',
    yes: 'Yes',
    cancel: 'Cancel',
    pending: 'Replacement request sent. Waiting for the administrator.',
    asks: (name: string) => `${name} asks to take the group`,
    adminReplacement: (name: string) =>
      `${name} needs a substitute. Any teacher can take the group, or pick a teacher above.`,
    approve: 'Approve',
    reject: 'Reject',
    failed: 'Failed',
  },
};

// Замены преподавателя группы (миграции 0045, 0046).
// owner   — ведущий группы: «Запрос на замену» (без администратора);
// teacher — другой преподаватель: «Взять группу», «Вернуть группу» или
//           «Заменить преподавателя» (решает администратор);
// admin   — одобряет запросы и видит, кто просит замену.
export function GroupTeacherRequests({
  groupId,
  teacherId,
  myId,
  mode,
  onChanged,
}: {
  groupId: string;
  teacherId: string | null;
  myId: string;
  mode: 'owner' | 'teacher' | 'admin';
  onChanged?: () => void;
}) {
  const s = useStrings(STRINGS);
  const [requests, setRequests] = useState<GroupTeacherRequest[]>([]);
  const [canReturn, setCanReturn] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchGroupTeacherRequests(groupId)
      .then(setRequests)
      .catch(() => {});
    if (mode === 'teacher') canReturnGroup(groupId, myId, teacherId).then(setCanReturn);
  }, [groupId, myId, teacherId, mode]);

  useEffect(load, [load]);

  const replacement = requests.find((r) => r.kind === 'replacement');
  const takeovers = requests.filter((r) => r.kind === 'takeover');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      load();
      onChanged?.();
    } catch (e) {
      Alert.alert(s.failed, errorText(e));
    }
    setBusy(false);
  };

  const confirm = (title: string, text: string, ok: string, action: () => Promise<void>) =>
    Alert.alert(title, text, [
      { text: s.cancel, style: 'cancel' },
      { text: ok, onPress: () => run(action) },
    ]);

  // «Взять группу», «Вернуть группу» и «Заменить преподавателя» — одна функция
  // на сервере; по тому, чья группа после вызова, понятно, что произошло.
  const takeover = async () => {
    const id = await requestGroupTakeover(groupId);
    const { data } = await supabase.from('groups').select('teacher_id').eq('id', groupId).single();
    if (data?.teacher_id === myId) {
      if (replacement) sendPushNotification({ event: 'group_replacement_taken', id: replacement.id });
      Alert.alert(s.taken);
    } else {
      sendPushNotification({ event: 'group_request', id });
    }
  };

  if (mode === 'owner') {
    if (replacement) {
      return (
        <View style={styles.wrapper}>
          <Text style={styles.note}>{s.replacementSent}</Text>
          <Button
            title={s.cancelReplacement}
            variant="secondary"
            loading={busy}
            onPress={() => run(() => cancelGroupReplacement(replacement.id))}
          />
        </View>
      );
    }
    return (
      <View style={styles.wrapper}>
        <Button
          title={s.askReplacement}
          variant="secondary"
          loading={busy}
          onPress={() =>
            confirm(s.askReplacementQ, s.askReplacementText, s.send, async () => {
              const id = await requestGroupReplacement(groupId);
              sendPushNotification({ event: 'group_replacement', id });
            })
          }
        />
      </View>
    );
  }

  if (mode === 'teacher') {
    if (replacement) {
      return (
        <Card style={styles.wrapper}>
          <Text style={styles.asks}>{s.needsReplacement(replacement.requester?.full_name ?? '')}</Text>
          <Button title={s.take} loading={busy} onPress={() => confirm(s.takeQ, s.takeText, s.yes, takeover)} />
        </Card>
      );
    }
    if (canReturn) {
      return (
        <View style={styles.wrapper}>
          <Button
            title={s.giveBack}
            loading={busy}
            onPress={() => confirm(s.giveBackQ, s.giveBackText, s.yes, takeover)}
          />
        </View>
      );
    }
    if (takeovers.length > 0) return <Text style={styles.note}>{s.pending}</Text>;
    return (
      <View style={styles.wrapper}>
        <Button
          title={s.request}
          variant="secondary"
          loading={busy}
          onPress={() => confirm(s.requestQ, s.requestText, s.send, takeover)}
        />
      </View>
    );
  }

  if (requests.length === 0) return null;
  return (
    <View style={styles.wrapper}>
      {replacement ? <Text style={styles.note}>{s.adminReplacement(replacement.requester?.full_name ?? '')}</Text> : null}
      {takeovers.map((r) => (
        <Card key={r.id}>
          <Text style={styles.asks}>{s.asks(r.requester?.full_name ?? '')}</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Button
                title={s.approve}
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    await decideGroupRequest(r.id, true);
                    // Остальные запросы по группе сервер отклонил — сообщаем всем авторам.
                    takeovers.forEach((other) => sendPushNotification({ event: 'group_request_decided', id: other.id }));
                  })
                }
              />
            </View>
            <View style={styles.half}>
              <Button
                title={s.reject}
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    await decideGroupRequest(r.id, false);
                    sendPushNotification({ event: 'group_request_decided', id: r.id });
                  })
                }
              />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.md },
  note: { color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 13, lineHeight: 18 },
  asks: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
