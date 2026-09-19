import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { Homework, HomeworkSubmission } from '../../types/database';
import type { StudentStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StudentStackParamList, 'HomeworkDetail'>;

export function HomeworkDetailScreen({ route }: Props) {
  const { homeworkId } = route.params;
  const { profile } = useAuth();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: hw } = await supabase.from('homework').select('*').eq('id', homeworkId).single();
    setHomework(hw as Homework);

    if (profile) {
      const { data: sub } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('homework_id', homeworkId)
        .eq('student_id', profile.id)
        .maybeSingle();
      if (sub) {
        setSubmission(sub as HomeworkSubmission);
        setContent((sub as HomeworkSubmission).content ?? '');
      }
    }
  }, [homeworkId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSubmit = async () => {
    if (!profile) return;
    if (!content.trim()) {
      Alert.alert('Опишите выполненную работу перед отправкой');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('homework_submissions')
      .upsert(
        {
          homework_id: homeworkId,
          student_id: profile.id,
          content: content.trim(),
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'homework_id,student_id' }
      )
      .select()
      .single();
    setSaving(false);
    if (error) {
      Alert.alert('Ошибка отправки', error.message);
      return;
    }
    setSubmission(data as HomeworkSubmission);
    Alert.alert('Готово', 'Работа отправлена на проверку');
  };

  if (!homework) {
    return (
      <Screen>
        <Text style={styles.empty}>Загрузка…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{homework.title}</Text>
      {homework.due_date ? <Text style={styles.due}>Сдать до {homework.due_date}</Text> : null}
      <Card>
        <Text style={styles.description}>{homework.description || 'Описание не указано'}</Text>
      </Card>

      <Text style={styles.sectionTitle}>
        {submission ? 'Ваш ответ' : 'Отправить выполненную работу'}
      </Text>
      <TextField
        placeholder="Опишите работу, приложите ссылку на фото и т.д."
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={5}
        style={styles.textarea}
      />
      <Button
        title={submission ? 'Обновить ответ' : 'Отправить'}
        onPress={onSubmit}
        loading={saving}
      />

      {submission?.status === 'reviewed' ? (
        <Card style={styles.feedbackCard}>
          <Text style={styles.sectionTitle}>Отзыв преподавателя</Text>
          {submission.grade != null ? <Text style={styles.grade}>Оценка: {submission.grade}</Text> : null}
          <Text style={styles.description}>{submission.feedback || 'Без комментария'}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  due: { color: colors.textMuted, marginBottom: spacing.md },
  description: { color: colors.text, lineHeight: 21 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.sm },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  feedbackCard: { marginTop: spacing.lg },
  grade: { fontWeight: '700', color: colors.success, marginBottom: spacing.xs },
});
