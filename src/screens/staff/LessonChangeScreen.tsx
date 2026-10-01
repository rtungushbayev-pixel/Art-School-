import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { DAY_NAMES, formatDayMonth, formatTime, parseDateKey } from '../../lib/schedule';
import { colors, radius, spacing } from '../../theme/colors';
import type { Lesson, LessonChange } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StaffStackParamList, 'LessonChange'>;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Разовое изменение занятия на одну дату: отмена или перенос времени/кабинета.
// Регулярное расписание не меняется — для этого есть экран занятия в группе.
export function LessonChangeScreen({ route }: Props) {
  const { lessonId, date } = route.params;
  const navigation = useNavigation();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [existing, setExisting] = useState<LessonChange | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [{ data: lessonRow }, { data: changeRow }] = await Promise.all([
          supabase.from('lessons').select('*').eq('id', lessonId).single(),
          supabase.from('lesson_changes').select('*').eq('lesson_id', lessonId).eq('lesson_date', date).maybeSingle(),
        ]);
        setLesson(lessonRow as Lesson);
        const change = changeRow as LessonChange | null;
        setExisting(change);
        if (change) {
          setCancelled(change.cancelled);
          setStartTime(change.start_time ? formatTime(change.start_time) : '');
          setEndTime(change.end_time ? formatTime(change.end_time) : '');
          setRoom(change.room ?? '');
          setNote(change.note ?? '');
        }
      })();
    }, [lessonId, date])
  );

  const onSave = async () => {
    const hasTime = !!startTime.trim() || !!endTime.trim();
    if (!cancelled && hasTime) {
      if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
        Alert.alert('Укажите новое время в формате ЧЧ:ММ, например 15:30');
        return;
      }
      if (startTime >= endTime) {
        Alert.alert('Время окончания должно быть позже начала');
        return;
      }
    }
    if (!cancelled && !hasTime && !room.trim() && !note.trim()) {
      Alert.alert('Ничего не изменено', 'Отметьте отмену, укажите новое время, кабинет или комментарий.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('lesson_changes').upsert(
      {
        lesson_id: lessonId,
        lesson_date: date,
        cancelled,
        start_time: cancelled || !hasTime ? null : startTime,
        end_time: cancelled || !hasTime ? null : endTime,
        room: cancelled ? null : room.trim() || null,
        note: note.trim() || null,
      },
      { onConflict: 'lesson_id,lesson_date' }
    );
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось сохранить', error.message);
      return;
    }
    navigation.goBack();
  };

  const onRestore = () => {
    if (!existing) return;
    Alert.alert('Вернуть занятие как в расписании?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Вернуть',
        onPress: async () => {
          const { error } = await supabase.from('lesson_changes').delete().eq('id', existing.id);
          if (error) {
            Alert.alert('Не удалось сохранить', error.message);
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  };

  if (!lesson) {
    return (
      <Screen>
        <Text style={styles.muted}>Загрузка…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.muted}>
          {DAY_NAMES[lesson.day_of_week]}, {formatDayMonth(parseDateKey(date))}
        </Text>
        <Text style={styles.muted}>
          По расписанию: {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
          {lesson.room ? `, каб. ${lesson.room}` : ''}
        </Text>
      </Card>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setCancelled(false)}
          style={[styles.toggle, !cancelled && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, !cancelled && styles.toggleTextActive]}>Перенести</Text>
        </Pressable>
        <Pressable onPress={() => setCancelled(true)} style={[styles.toggle, cancelled && styles.toggleDanger]}>
          <Text style={[styles.toggleText, cancelled && styles.toggleTextActive]}>Отменить</Text>
        </Pressable>
      </View>

      {!cancelled ? (
        <>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <TextField label="Новое начало" value={startTime} onChangeText={setStartTime} placeholder="15:00" />
            </View>
            <View style={styles.timeField}>
              <TextField label="Новый конец" value={endTime} onChangeText={setEndTime} placeholder="16:30" />
            </View>
          </View>
          <TextField label="Другой кабинет" value={room} onChangeText={setRoom} placeholder="Оставьте пустым, если тот же" />
        </>
      ) : null}

      <TextField
        label="Комментарий для учеников"
        value={note}
        onChangeText={setNote}
        placeholder={cancelled ? 'Например: преподаватель заболел' : 'Например: занятие на пленэре'}
        multiline
      />

      <Button title="Сохранить" onPress={onSave} loading={saving} />
      {existing ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title="Вернуть как в расписании" variant="secondary" onPress={onRestore} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  muted: { color: colors.textMuted, marginTop: 2 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggle: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  toggleText: { color: colors.text, fontWeight: '600' },
  toggleTextActive: { color: colors.white },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  timeField: { flex: 1 },
});
