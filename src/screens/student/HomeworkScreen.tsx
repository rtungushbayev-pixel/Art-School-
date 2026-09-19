import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { Homework, HomeworkSubmission } from '../../types/database';
import type { StudentStackParamList } from '../../navigation/types';

export function HomeworkScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { profile } = useAuth();
  const [items, setItems] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, HomeworkSubmission>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('student_id', profile.id);
    const groupIds = (memberships ?? []).map((m) => m.group_id);

    if (groupIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data: homeworkData } = await supabase
      .from('homework')
      .select('*')
      .in('group_id', groupIds)
      .order('due_date', { ascending: true });

    const list = (homeworkData as Homework[]) ?? [];
    setItems(list);

    if (list.length > 0) {
      const { data: subs } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', profile.id)
        .in(
          'homework_id',
          list.map((h) => h.id)
        );
      const map: Record<string, HomeworkSubmission> = {};
      for (const s of (subs as HomeworkSubmission[]) ?? []) {
        map[s.homework_id] = s;
      }
      setSubmissions(map);
    }
    setLoading(false);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>Домашние задания</Text>
      {items.length === 0 && !loading ? (
        <Card>
          <Text style={styles.empty}>Заданий пока нет</Text>
        </Card>
      ) : null}
      {items.map((item) => {
        const submission = submissions[item.id];
        return (
          <Pressable key={item.id} onPress={() => navigation.navigate('HomeworkDetail', { homeworkId: item.id })}>
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                <StatusPill submission={submission} />
              </View>
              {item.due_date ? <Text style={styles.due}>Сдать до {item.due_date}</Text> : null}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

function StatusPill({ submission }: { submission?: HomeworkSubmission }) {
  let label = 'Не сдано';
  let bg = colors.border;
  let fg = colors.textMuted;
  if (submission?.status === 'reviewed') {
    label = submission.grade != null ? `Оценка ${submission.grade}` : 'Проверено';
    bg = colors.success;
    fg = colors.white;
  } else if (submission?.status === 'submitted') {
    label = 'На проверке';
    bg = colors.accent;
    fg = colors.white;
  }
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm },
  due: { color: colors.textMuted, marginTop: spacing.xs },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  pillText: { fontSize: 12, fontWeight: '700' },
});
