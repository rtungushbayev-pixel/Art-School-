import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { supabase } from '../../lib/supabase';
import { fetchGroupMembers } from '../../lib/groups';
import { colors, radius, spacing } from '../../theme/colors';
import type { Homework, HomeworkSubmission, Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

export function HomeworkSubmissionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const route = useRoute<RouteProp<StaffStackParamList, 'HomeworkSubmissions'>>();
  const { homeworkId, homeworkTitle } = route.params;

  const [students, setStudents] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, HomeworkSubmission>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: homework } = await supabase.from('homework').select('*').eq('id', homeworkId).single();
    if (!homework) {
      setLoading(false);
      return;
    }
    const [members, { data: subRows }] = await Promise.all([
      fetchGroupMembers((homework as Homework).group_id),
      supabase.from('homework_submissions').select('*').eq('homework_id', homeworkId),
    ]);
    setStudents(members);
    const map: Record<string, HomeworkSubmission> = {};
    for (const s of (subRows as HomeworkSubmission[]) ?? []) {
      map[s.student_id] = s;
    }
    setSubmissions(map);
    setLoading(false);
  }, [homeworkId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>{homeworkTitle}</Text>
      {students.length === 0 && !loading ? <Text style={styles.empty}>В группе пока нет учеников</Text> : null}
      {students.map((student) => {
        const submission = submissions[student.id];
        const { label, color } = statusInfo(submission);
        return (
          <Pressable
            key={student.id}
            disabled={!submission}
            onPress={() =>
              submission &&
              navigation.navigate('GradeSubmission', { submissionId: submission.id, studentName: student.full_name })
            }
          >
            <Card style={styles.row}>
              <Avatar uri={student.avatar_url} name={student.full_name} size={36} />
              <Text style={styles.name}>{student.full_name}</Text>
              <View style={[styles.pill, { backgroundColor: color }]}>
                <Text style={styles.pillText}>{label}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

function statusInfo(submission?: HomeworkSubmission) {
  if (!submission) return { label: 'Не сдано', color: colors.border };
  if (submission.status === 'reviewed') {
    return { label: submission.grade != null ? `Оценка ${submission.grade}` : 'Проверено', color: colors.success };
  }
  return { label: 'На проверке', color: colors.accent };
}

const styles = StyleSheet.create({
  header: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontWeight: '600', color: colors.text },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  pillText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
