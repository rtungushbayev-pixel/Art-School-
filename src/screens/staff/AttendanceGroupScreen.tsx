import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { AttendanceStatus, Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StaffStackParamList, 'AttendanceGroup'>;

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string }> = {
  present: { label: 'Был(а)', color: colors.success },
  late: { label: 'Опоздал(а)', color: colors.warning },
  absent: { label: 'Отсутствовал(а)', color: colors.danger },
  excused: { label: 'Уваж. причина', color: colors.textMuted },
};

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function AttendanceGroupScreen({ route }: Props) {
  const { groupId, groupName } = route.params;
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date());
  const [students, setStudents] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);

  const dateKey = toISODate(date);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: members } = await supabase
      .from('group_members')
      .select('student_id, profiles:student_id ( * )')
      .eq('group_id', groupId);

    const list = ((members as any[]) ?? []).map((m) => m.profiles as Profile).filter(Boolean);
    setStudents(list);

    const { data: attendanceRows } = await supabase
      .from('attendance')
      .select('*')
      .eq('group_id', groupId)
      .eq('lesson_date', dateKey);

    const map: Record<string, AttendanceStatus> = {};
    for (const row of attendanceRows ?? []) {
      map[row.student_id] = row.status;
    }
    setStatuses(map);
    setLoading(false);
  }, [groupId, dateKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cycleStatus = async (studentId: string) => {
    if (!profile) return;
    const current = statuses[studentId] ?? 'present';
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length];
    setStatuses((prev) => ({ ...prev, [studentId]: next }));
    await supabase.from('attendance').upsert(
      {
        group_id: groupId,
        student_id: studentId,
        lesson_date: dateKey,
        status: next,
        marked_by: profile.id,
      },
      { onConflict: 'group_id,student_id,lesson_date,lesson_id' }
    );
  };

  const changeDay = (delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    setDate(next);
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>{groupName}</Text>

      <View style={styles.dateRow}>
        <Pressable onPress={() => changeDay(-1)} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.date}>{dateKey}</Text>
        <Pressable onPress={() => changeDay(1)} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>›</Text>
        </Pressable>
      </View>

      {students.length === 0 && !loading ? <Text style={styles.empty}>В группе пока нет учеников</Text> : null}

      {students.map((student) => {
        const status = statuses[student.id] ?? null;
        const config = status ? STATUS_CONFIG[status] : null;
        return (
          <Pressable key={student.id} onPress={() => cycleStatus(student.id)}>
            <Card style={styles.row}>
              <Avatar uri={student.avatar_url} name={student.full_name} size={36} />
              <Text style={styles.studentName}>{student.full_name}</Text>
              <View style={[styles.statusPill, { backgroundColor: config?.color ?? colors.border }]}>
                <Text style={styles.statusText}>{config?.label ?? 'Отметить'}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  dateButton: { padding: spacing.sm },
  dateButtonText: { fontSize: 20, color: colors.primary, fontWeight: '700' },
  date: { fontSize: 15, fontWeight: '600', color: colors.text, minWidth: 100, textAlign: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  studentName: { flex: 1, fontWeight: '600', color: colors.text },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  statusText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
