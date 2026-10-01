import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { dayName, formatDayMonth, formatTime, parseDateKey } from '../../lib/schedule';
import { colors, radius, spacing } from '../../theme/colors';
import type { Lesson, LessonChange } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    needTime: 'Укажите новое время в формате ЧЧ:ММ, например 15:30',
    endAfterStart: 'Время окончания должно быть позже начала',
    nothingChanged: 'Ничего не изменено',
    nothingChangedHint: 'Отметьте отмену, укажите новое время, кабинет или комментарий.',
    saveFailed: 'Не удалось сохранить',
    restoreTitle: 'Вернуть занятие как в расписании?',
    cancel: 'Отмена',
    restore: 'Вернуть',
    loading: 'Загрузка…',
    scheduled: 'По расписанию:',
    roomShort: (room: string) => `, каб. ${room}`,
    reschedule: 'Перенести',
    cancelLesson: 'Отменить',
    newStart: 'Новое начало',
    newEnd: 'Новый конец',
    otherRoom: 'Другой кабинет',
    otherRoomPlaceholder: 'Оставьте пустым, если тот же',
    note: 'Комментарий для учеников',
    notePlaceholderCancelled: 'Например: преподаватель заболел',
    notePlaceholderMoved: 'Например: занятие на пленэре',
    save: 'Сохранить',
    restoreButton: 'Вернуть как в расписании',
  },
  kk: {
    needTime: 'Жаңа уақытты СС:ММ пішімінде көрсетіңіз, мысалы 15:30',
    endAfterStart: 'Аяқталу уақыты басталу уақытынан кеш болуы керек',
    nothingChanged: 'Ештеңе өзгертілмеді',
    nothingChangedHint: 'Болдырмауды белгілеңіз, жаңа уақытты, кабинетті немесе пікірді көрсетіңіз.',
    saveFailed: 'Сақтау мүмкін болмады',
    restoreTitle: 'Сабақты кестедегідей қайтару керек пе?',
    cancel: 'Бас тарту',
    restore: 'Қайтару',
    loading: 'Жүктелуде…',
    scheduled: 'Кесте бойынша:',
    roomShort: (room: string) => `, ${room} каб.`,
    reschedule: 'Ауыстыру',
    cancelLesson: 'Болдырмау',
    newStart: 'Жаңа басталуы',
    newEnd: 'Жаңа аяқталуы',
    otherRoom: 'Басқа кабинет',
    otherRoomPlaceholder: 'Сол кабинет болса, бос қалдырыңыз',
    note: 'Оқушыларға арналған пікір',
    notePlaceholderCancelled: 'Мысалы: мұғалім ауырып қалды',
    notePlaceholderMoved: 'Мысалы: сабақ пленэрде өтеді',
    save: 'Сақтау',
    restoreButton: 'Кестедегідей қайтару',
  },
  en: {
    needTime: 'Enter the new time as HH:MM, for example 15:30',
    endAfterStart: 'The end time must be later than the start time',
    nothingChanged: 'Nothing changed',
    nothingChangedHint: 'Mark it as cancelled, or enter a new time, room or comment.',
    saveFailed: 'Could not save',
    restoreTitle: 'Restore the class to its regular schedule?',
    cancel: 'Cancel',
    restore: 'Restore',
    loading: 'Loading…',
    scheduled: 'Scheduled:',
    roomShort: (room: string) => `, room ${room}`,
    reschedule: 'Reschedule',
    cancelLesson: 'Cancel class',
    newStart: 'New start',
    newEnd: 'New end',
    otherRoom: 'Different room',
    otherRoomPlaceholder: 'Leave empty if it is the same',
    note: 'Comment for students',
    notePlaceholderCancelled: 'For example: the teacher is ill',
    notePlaceholderMoved: 'For example: plein air class',
    save: 'Save',
    restoreButton: 'Restore regular schedule',
  },
};

type Props = NativeStackScreenProps<StaffStackParamList, 'LessonChange'>;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Разовое изменение занятия на одну дату: отмена или перенос времени/кабинета.
// Регулярное расписание не меняется — для этого есть экран занятия в группе.
export function LessonChangeScreen({ route }: Props) {
  const { lessonId, date } = route.params;
  const navigation = useNavigation();
  const s = useStrings(STRINGS);

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
        Alert.alert(s.needTime);
        return;
      }
      if (startTime >= endTime) {
        Alert.alert(s.endAfterStart);
        return;
      }
    }
    if (!cancelled && !hasTime && !room.trim() && !note.trim()) {
      Alert.alert(s.nothingChanged, s.nothingChangedHint);
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
      Alert.alert(s.saveFailed, error.message);
      return;
    }
    navigation.goBack();
  };

  const onRestore = () => {
    if (!existing) return;
    Alert.alert(s.restoreTitle, undefined, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.restore,
        onPress: async () => {
          const { error } = await supabase.from('lesson_changes').delete().eq('id', existing.id);
          if (error) {
            Alert.alert(s.saveFailed, error.message);
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
        <Text style={styles.muted}>{s.loading}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.muted}>
          {dayName(lesson.day_of_week)}, {formatDayMonth(parseDateKey(date))}
        </Text>
        <Text style={styles.muted}>
          {s.scheduled} {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
          {lesson.room ? s.roomShort(lesson.room) : ''}
        </Text>
      </Card>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setCancelled(false)}
          style={[styles.toggle, !cancelled && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, !cancelled && styles.toggleTextActive]}>{s.reschedule}</Text>
        </Pressable>
        <Pressable onPress={() => setCancelled(true)} style={[styles.toggle, cancelled && styles.toggleDanger]}>
          <Text style={[styles.toggleText, cancelled && styles.toggleTextActive]}>{s.cancelLesson}</Text>
        </Pressable>
      </View>

      {!cancelled ? (
        <>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <TextField label={s.newStart} value={startTime} onChangeText={setStartTime} placeholder="15:00" />
            </View>
            <View style={styles.timeField}>
              <TextField label={s.newEnd} value={endTime} onChangeText={setEndTime} placeholder="16:30" />
            </View>
          </View>
          <TextField label={s.otherRoom} value={room} onChangeText={setRoom} placeholder={s.otherRoomPlaceholder} />
        </>
      ) : null}

      <TextField
        label={s.note}
        value={note}
        onChangeText={setNote}
        placeholder={cancelled ? s.notePlaceholderCancelled : s.notePlaceholderMoved}
        multiline
      />

      <Button title={s.save} onPress={onSave} loading={saving} />
      {existing ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title={s.restoreButton} variant="secondary" onPress={onRestore} />
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
