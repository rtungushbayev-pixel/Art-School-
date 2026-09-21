import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

const DAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function CreateLessonScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<StaffStackParamList, 'CreateLesson'>>();
  const { groupId } = route.params;
  const { profile } = useAuth();

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Укажите название занятия');
      return;
    }
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      Alert.alert('Укажите время в формате ЧЧ:ММ, например 15:30');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('lessons').insert({
      group_id: groupId,
      title: title.trim(),
      room: room.trim() || null,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось добавить занятие', error.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Новое занятие</Text>

      <TextField label="Название" value={title} onChangeText={setTitle} placeholder="Например: Рисунок" />

      <Text style={styles.label}>День недели</Text>
      <View style={styles.dayRow}>
        {DAYS.map((d) => (
          <Pressable
            key={d.value}
            onPress={() => setDayOfWeek(d.value)}
            style={[styles.dayOption, dayOfWeek === d.value && styles.dayOptionActive]}
          >
            <Text style={[styles.dayText, dayOfWeek === d.value && styles.dayTextActive]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <TextField label="Начало (ЧЧ:ММ)" value={startTime} onChangeText={setStartTime} placeholder="15:00" />
        </View>
        <View style={styles.timeField}>
          <TextField label="Конец (ЧЧ:ММ)" value={endTime} onChangeText={setEndTime} placeholder="16:30" />
        </View>
      </View>

      <TextField label="Кабинет" value={room} onChangeText={setRoom} placeholder="Например: 204" />

      <Button title="Добавить" onPress={onCreate} loading={saving} />
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
