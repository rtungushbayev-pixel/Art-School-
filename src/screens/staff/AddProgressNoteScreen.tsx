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
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    needTopic: 'Укажите тему',
    needTopicHint: 'Например: «Натюрморт с драпировкой» или «Итоги месяца».',
    saveFailed: 'Не удалось сохранить',
    hint: 'Отзыв увидят ученик и его родители.',
    topic: 'Тема',
    topicPlaceholder: 'Например: Итоги сентября',
    comment: 'Комментарий',
    commentPlaceholder: 'Что получается, над чем поработать',
    rating: 'Оценка (необязательно)',
    save: 'Сохранить',
  },
  kk: {
    needTopic: 'Тақырыпты көрсетіңіз',
    needTopicHint: 'Мысалы: «Драпировкасы бар натюрморт» немесе «Ай қорытындысы».',
    saveFailed: 'Сақтау мүмкін болмады',
    hint: 'Пікірді оқушы мен оның ата-анасы көреді.',
    topic: 'Тақырып',
    topicPlaceholder: 'Мысалы: Қыркүйек қорытындысы',
    comment: 'Пікір',
    commentPlaceholder: 'Не жақсы шығып жатыр, неге көңіл бөлу керек',
    rating: 'Баға (міндетті емес)',
    save: 'Сақтау',
  },
  en: {
    needTopic: 'Enter a topic',
    needTopicHint: 'For example: “Still life with drapery” or “Month summary”.',
    saveFailed: 'Could not save',
    hint: 'The student and their parents will see this feedback.',
    topic: 'Topic',
    topicPlaceholder: 'For example: September summary',
    comment: 'Comment',
    commentPlaceholder: 'What is going well and what to work on',
    rating: 'Rating (optional)',
    save: 'Save',
  },
};

type Props = NativeStackScreenProps<StaffStackParamList, 'AddProgressNote'>;

export function AddProgressNoteScreen({ route, navigation }: Props) {
  const { studentId, studentName } = route.params;
  const s = useStrings(STRINGS);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert(s.needTopic, s.needTopicHint);
      return;
    }
    setSaving(true);
    try {
      await addProgressNote({ studentId, title: title.trim(), body: body.trim(), rating });
      navigation.goBack();
    } catch (e) {
      Alert.alert(s.saveFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.student}>{studentName}</Text>
      <Text style={styles.hint}>{s.hint}</Text>
      <TextField label={s.topic} value={title} onChangeText={setTitle} placeholder={s.topicPlaceholder} />
      <TextField
        label={s.comment}
        value={body}
        onChangeText={setBody}
        multiline
        placeholder={s.commentPlaceholder}
        style={styles.bodyInput}
      />
      <Text style={styles.label}>{s.rating}</Text>
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
      <Button title={s.save} onPress={onSave} loading={saving} />
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
