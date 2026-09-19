import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { Lesson } from '../../types/database';

const DAY_NAMES = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export function ScheduleScreen() {
  const { profile } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
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
      setLessons([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('lessons')
      .select('*')
      .in('group_id', groupIds)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    setLessons((data as Lesson[]) ?? []);
    setLoading(false);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const byDay = new Map<number, Lesson[]>();
  for (const lesson of lessons) {
    const list = byDay.get(lesson.day_of_week) ?? [];
    list.push(lesson);
    byDay.set(lesson.day_of_week, list);
  }

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>Расписание занятий</Text>
      {lessons.length === 0 && !loading ? (
        <Card>
          <Text style={styles.empty}>Пока нет занятий в расписании</Text>
        </Card>
      ) : null}
      {[1, 2, 3, 4, 5, 6, 7].map((day) =>
        byDay.has(day) ? (
          <View key={day} style={styles.dayBlock}>
            <Text style={styles.dayTitle}>{DAY_NAMES[day]}</Text>
            {byDay.get(day)!.map((lesson) => (
              <Card key={lesson.id} style={styles.lessonCard}>
                <Text style={styles.time}>
                  {lesson.start_time.slice(0, 5)}–{lesson.end_time.slice(0, 5)}
                </Text>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  {lesson.room ? <Text style={styles.room}>Кабинет {lesson.room}</Text> : null}
                </View>
              </Card>
            ))}
          </View>
        ) : null
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center' },
  dayBlock: { marginBottom: spacing.md },
  dayTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  lessonCard: { flexDirection: 'row', alignItems: 'center' },
  time: { width: 90, fontWeight: '700', color: colors.text },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  room: { color: colors.textMuted, marginTop: 2 },
});
