import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../theme/colors';
import type { HomeworkSubmission } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

export function GradeSubmissionScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<StaffStackParamList, 'GradeSubmission'>>();
  const { submissionId, studentName } = route.params;

  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('homework_submissions').select('*').eq('id', submissionId).single();
    if (data) {
      const s = data as HomeworkSubmission;
      setSubmission(s);
      setGrade(s.grade != null ? String(s.grade) : '');
      setFeedback(s.feedback ?? '');
    }
  }, [submissionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSave = async () => {
    const gradeNumber = grade.trim() ? Number(grade.trim()) : null;
    if (grade.trim() && (Number.isNaN(gradeNumber) || gradeNumber! < 0 || gradeNumber! > 100)) {
      Alert.alert('Оценка должна быть числом от 0 до 100');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('homework_submissions')
      .update({
        status: 'reviewed',
        grade: gradeNumber,
        feedback: feedback.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось сохранить', error.message);
      return;
    }
    navigation.goBack();
  };

  if (!submission) {
    return (
      <Screen>
        <Text style={styles.empty}>Загрузка…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{studentName}</Text>

      <Text style={styles.sectionTitle}>Ответ ученика</Text>
      <Card>
        <Text style={styles.content}>{submission.content || 'Без текста'}</Text>
      </Card>

      <TextField label="Оценка (0–100)" value={grade} onChangeText={setGrade} keyboardType="number-pad" />
      <TextField
        label="Отзыв"
        value={feedback}
        onChangeText={setFeedback}
        multiline
        numberOfLines={4}
        style={styles.textarea}
      />

      <Button title="Сохранить" onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  content: { color: colors.text, lineHeight: 21 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
});
