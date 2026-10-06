import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { fetchGroupMembers } from '../../lib/groups';
import { fetchGroupAttendance, localISODate, markAttendance } from '../../lib/attendance';
import { errorText } from '../../lib/errors';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { AttendanceStatus, Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: colors.success,
  late: colors.warning,
  absent: colors.danger,
  excused: colors.textMuted,
};

const STRINGS = {
  ru: {
    statuses: { present: 'Был', late: 'Опоздал', absent: 'Нет', excused: 'Уваж.' } as Record<AttendanceStatus, string>,
    hint: 'Отметьте каждого ученика. Если отметить «Нет», родители сразу получат уведомление.',
    today: 'Сегодня',
    allPresent: 'Остальные пришли',
    marked: (done: number, total: number) => `Отмечено ${done} из ${total}`,
    noStudents: 'В группе пока нет учеников',
    failed: 'Не удалось сохранить отметку',
  },
  kk: {
    statuses: { present: 'Келді', late: 'Кешікті', absent: 'Жоқ', excused: 'Себепті' } as Record<AttendanceStatus, string>,
    hint: 'Әр оқушыны белгілеңіз. «Жоқ» деп белгілесеңіз, ата-анаға бірден хабарлама барады.',
    today: 'Бүгін',
    allPresent: 'Қалғандары келді',
    marked: (done: number, total: number) => `${total} ішінен ${done} белгіленді`,
    noStudents: 'Топта әлі оқушылар жоқ',
    failed: 'Белгіні сақтау мүмкін болмады',
  },
  en: {
    statuses: { present: 'Here', late: 'Late', absent: 'Absent', excused: 'Excused' } as Record<AttendanceStatus, string>,
    hint: 'Mark every student. If you mark someone absent, their parents get a notification right away.',
    today: 'Today',
    allPresent: 'Everyone else is here',
    marked: (done: number, total: number) => `${done} of ${total} marked`,
    noStudents: 'No students in this group yet',
    failed: 'Could not save the mark',
  },
};

// Проверка учеников перед занятием: отметка на сегодня (или другой день
// в пределах 30 дней). «Нет» — пуш родителям.
export function AttendanceScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'Attendance'>>();
  const { groupId, groupName } = route.params;
  const s = useStrings(STRINGS);
  const [date, setDate] = useState(() => new Date());
  const [students, setStudents] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  const dateKey = localISODate(date);
  const isToday = dateKey === localISODate(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [members, rows] = await Promise.all([fetchGroupMembers(groupId), fetchGroupAttendance(groupId, dateKey)]);
      setStudents(members.sort((a, b) => a.full_name.localeCompare(b.full_name)));
      const map: Record<string, AttendanceStatus> = {};
      for (const row of rows) map[row.student_id] = row.status;
      setStatuses(map);
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, [groupId, dateKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mark = async (studentId: string, status: AttendanceStatus) => {
    const previous = statuses[studentId];
    if (previous === status) return;
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
    try {
      await markAttendance(groupId, studentId, dateKey, status);
    } catch (e) {
      setStatuses((prev) => {
        const next = { ...prev };
        if (previous) next[studentId] = previous;
        else delete next[studentId];
        return next;
      });
      Alert.alert(s.failed, errorText(e));
    }
  };

  const markRestPresent = async () => {
    setSavingAll(true);
    for (const student of students) {
      if (!statuses[student.id]) await mark(student.id, 'present');
    }
    setSavingAll(false);
  };

  const changeDay = (delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    setDate(next);
  };

  const done = students.filter((st) => statuses[st.id]).length;
  const [y, m, d] = dateKey.split('-');

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>{groupName}</Text>
      <Text style={styles.hint}>{s.hint}</Text>

      <View style={styles.dateRow}>
        <Pressable onPress={() => changeDay(-1)} style={styles.dateButton} hitSlop={8}>
          <Text style={styles.dateButtonText}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setDate(new Date())}>
          <Text style={styles.date}>{isToday ? `${s.today}, ${d}.${m}` : `${d}.${m}.${y}`}</Text>
        </Pressable>
        <Pressable onPress={() => changeDay(1)} style={styles.dateButton} hitSlop={8} disabled={isToday}>
          <Text style={[styles.dateButtonText, isToday && styles.dateButtonDisabled]}>›</Text>
        </Pressable>
      </View>

      {students.length === 0 && !loading ? <Text style={styles.empty}>{s.noStudents}</Text> : null}
      {students.length > 0 ? <Text style={styles.progress}>{s.marked(done, students.length)}</Text> : null}

      {students.map((student) => (
        <Card key={student.id}>
          <View style={styles.studentRow}>
            <Avatar uri={student.avatar_url} name={student.full_name} size={32} />
            <Text style={styles.studentName} numberOfLines={1}>
              {student.full_name}
            </Text>
          </View>
          <View style={styles.statusRow}>
            {STATUS_ORDER.map((status) => {
              const active = statuses[student.id] === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => mark(student.id, status)}
                  style={[
                    styles.statusButton,
                    active && { backgroundColor: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] },
                  ]}
                >
                  <Text style={[styles.statusText, active && styles.statusTextActive]}>{s.statuses[status]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}

      {students.length > 0 && done < students.length ? (
        <Button title={s.allPresent} variant="secondary" onPress={markRestPresent} loading={savingAll} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '800', color: colors.text },
  hint: { color: colors.textMuted, lineHeight: 20, marginTop: spacing.xs, marginBottom: spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.sm },
  dateButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  dateButtonText: { fontSize: 26, color: colors.primary, fontWeight: '700' },
  dateButtonDisabled: { color: colors.border },
  date: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 130, textAlign: 'center' },
  progress: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  studentName: { flex: 1, fontWeight: '600', fontSize: 15, color: colors.text },
  statusRow: { flexDirection: 'row', gap: spacing.xs },
  statusButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusText: { fontSize: 13, fontWeight: '600', color: colors.text },
  statusTextActive: { color: colors.white },
});
