import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { Lesson } from '../../types/database';
import { dayShort } from '../../lib/schedule';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    needTitle: 'Укажите название занятия',
    needTime: 'Укажите время в формате ЧЧ:ММ, например 15:30',
    saveFailed: 'Не удалось сохранить занятие',
    deleteTitle: 'Удалить занятие?',
    cancel: 'Отмена',
    delete: 'Удалить',
    editTitle: 'Редактировать занятие',
    newTitle: 'Новое занятие',
    name: 'Название',
    namePlaceholder: 'Например: Рисунок',
    weekday: 'День недели',
    start: 'Начало (ЧЧ:ММ)',
    end: 'Конец (ЧЧ:ММ)',
    room: 'Кабинет',
    roomPlaceholder: 'Например: 204',
    save: 'Сохранить',
    add: 'Добавить',
    deleteButton: 'Удалить занятие',
  },
  kk: {
    needTitle: 'Сабақтың атауын көрсетіңіз',
    needTime: 'Уақытты СС:ММ пішімінде көрсетіңіз, мысалы 15:30',
    saveFailed: 'Сабақты сақтау мүмкін болмады',
    deleteTitle: 'Сабақты жою керек пе?',
    cancel: 'Бас тарту',
    delete: 'Жою',
    editTitle: 'Сабақты өңдеу',
    newTitle: 'Жаңа сабақ',
    name: 'Атауы',
    namePlaceholder: 'Мысалы: Сурет',
    weekday: 'Апта күні',
    start: 'Басталуы (СС:ММ)',
    end: 'Аяқталуы (СС:ММ)',
    room: 'Кабинет',
    roomPlaceholder: 'Мысалы: 204',
    save: 'Сақтау',
    add: 'Қосу',
    deleteButton: 'Сабақты жою',
  },
  en: {
    needTitle: 'Enter a class name',
    needTime: 'Enter the time as HH:MM, for example 15:30',
    saveFailed: 'Could not save the class',
    deleteTitle: 'Delete this class?',
    cancel: 'Cancel',
    delete: 'Delete',
    editTitle: 'Edit class',
    newTitle: 'New class',
    name: 'Name',
    namePlaceholder: 'For example: Drawing',
    weekday: 'Day of the week',
    start: 'Start (HH:MM)',
    end: 'End (HH:MM)',
    room: 'Room',
    roomPlaceholder: 'For example: 204',
    save: 'Save',
    add: 'Add',
    deleteButton: 'Delete class',
  },
};

const DAYS = [1, 2, 3, 4, 5, 6, 7];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function CreateLessonScreen() {
  const navigation = useNavigation();
  const s = useStrings(STRINGS);
  const route = useRoute<RouteProp<StaffStackParamList, 'CreateLesson'>>();
  const { groupId, lessonId } = route.params;
  const isEditing = !!lessonId;
  const { profile } = useAuth();

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!lessonId) return;
      supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const lesson = data as Lesson;
          setTitle(lesson.title);
          setRoom(lesson.room ?? '');
          setDayOfWeek(lesson.day_of_week);
          setStartTime(lesson.start_time.slice(0, 5));
          setEndTime(lesson.end_time.slice(0, 5));
        });
    }, [lessonId])
  );

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert(s.needTitle);
      return;
    }
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      Alert.alert(s.needTime);
      return;
    }
    setSaving(true);
    const payload = {
      group_id: groupId,
      title: title.trim(),
      room: room.trim() || null,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    };
    const { error } = isEditing
      ? await supabase.from('lessons').update(payload).eq('id', lessonId)
      : await supabase.from('lessons').insert({ ...payload, created_by: profile?.id ?? null });
    setSaving(false);
    if (error) {
      Alert.alert(s.saveFailed, error.message);
      return;
    }
    navigation.goBack();
  };

  const onDelete = () => {
    Alert.alert(s.deleteTitle, title, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          await supabase.from('lessons').delete().eq('id', lessonId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{isEditing ? s.editTitle : s.newTitle}</Text>

      <TextField label={s.name} value={title} onChangeText={setTitle} placeholder={s.namePlaceholder} />

      <Text style={styles.label}>{s.weekday}</Text>
      <View style={styles.dayRow}>
        {DAYS.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDayOfWeek(d)}
            style={[styles.dayOption, dayOfWeek === d && styles.dayOptionActive]}
          >
            <Text style={[styles.dayText, dayOfWeek === d && styles.dayTextActive]}>{dayShort(d)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <TextField label={s.start} value={startTime} onChangeText={setStartTime} placeholder="15:00" />
        </View>
        <View style={styles.timeField}>
          <TextField label={s.end} value={endTime} onChangeText={setEndTime} placeholder="16:30" />
        </View>
      </View>

      <TextField label={s.room} value={room} onChangeText={setRoom} placeholder={s.roomPlaceholder} />

      <Button title={isEditing ? s.save : s.add} onPress={onSave} loading={saving} />

      {isEditing ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title={s.deleteButton} variant="danger" onPress={onDelete} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  dayRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  dayOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  dayOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  dayTextActive: { color: colors.white },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  timeField: { flex: 1 },
});
