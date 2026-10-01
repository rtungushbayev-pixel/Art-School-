import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { addProgressNote } from '../../lib/parents';
import { colors, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StaffStackParamList, 'AddProgressNote'>;

export function AddProgressNoteScreen({ route, navigation }: Props) {
  const { studentId, studentName } = route.params;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert('Укажите тему', 'Например: «Натюрморт с драпировкой» или «Итоги месяца».');
      return;
    }
    setSaving(true);
    try {
      await addProgressNote({ studentId, title: title.trim(), body: body.trim(), rating });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Не удалось сохранить', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.student}>{studentName}</Text>
      <Text style={styles.hint}>Отзыв увидят ученик и его родители.</Text>
      <TextField label="Тема" value={title} onChangeText={setTitle} placeholder="Например: Итоги сентября" />
      <TextField
        label="Комментарий"
        value={body}
        onChangeText={setBody}
        multiline
        placeholder="Что получается, над чем поработать"
        style={styles.bodyInput}
      />
      <Text style={styles.label}>Оценка (необязательно)</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(rating === n ? null : n)} hitSlop={6}>
            <Ionicons
              name={rating !== null && n <= rating ? 'star' : 'star-outline'}
              size={32}
              color={colors.accent}
            />
          </Pressable>
        ))}
      </View>
      <Button title="Сохранить" onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  student: { fontSize: 20, fontWeight: '700', color: colors.text },
  hint: { color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  bodyInput: { minHeight: 100, textAlignVertical: 'top' },
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  stars: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
});
