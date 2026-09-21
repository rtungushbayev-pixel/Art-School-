import React, { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { uploadImageAsset } from '../../lib/storage';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { Homework, HomeworkSubmission } from '../../types/database';
import type { StudentStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StudentStackParamList, 'HomeworkDetail'>;

export function HomeworkDetailScreen({ route }: Props) {
  const { homeworkId } = route.params;
  const { profile } = useAuth();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);
  const [content, setContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [newAsset, setNewAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        setAttachmentUrl((sub as HomeworkSubmission).attachment_url);
      }
    }
  }, [homeworkId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ к галерее, чтобы выбрать фото');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setNewAsset(result.assets[0]);
    }
  };

  const removeAttachment = () => {
    setNewAsset(null);
    setAttachmentUrl(null);
  };

  const onSubmit = async () => {
    if (!profile) return;
    if (!content.trim()) {
      Alert.alert('Опишите выполненную работу перед отправкой');
      return;
    }
    setSaving(true);
    try {
      let finalAttachmentUrl = attachmentUrl;
      if (newAsset) {
        setUploading(true);
        finalAttachmentUrl = await uploadImageAsset('homework', profile.id, newAsset.uri, newAsset.mimeType);
        setUploading(false);
      }

      const { data, error } = await supabase
        .from('homework_submissions')
        .upsert(
          {
            homework_id: homeworkId,
            student_id: profile.id,
            content: content.trim(),
            attachment_url: finalAttachmentUrl,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'homework_id,student_id' }
        )
        .select()
        .single();
      if (error) throw error;

      setSubmission(data as HomeworkSubmission);
      setAttachmentUrl((data as HomeworkSubmission).attachment_url);
      setNewAsset(null);
      Alert.alert('Готово', 'Работа отправлена на проверку');
    } catch (e) {
      Alert.alert('Ошибка отправки', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!homework) {
    return (
      <Screen>
        <Text style={styles.empty}>Загрузка…</Text>
      </Screen>
    );
  }

  const previewUri = newAsset?.uri ?? attachmentUrl;

  return (
    <Screen scroll>
      <Text style={styles.title}>{homework.title}</Text>
      {homework.due_date ? <Text style={styles.due}>Сдать до {homework.due_date}</Text> : null}
      <Card>
        <Text style={styles.description}>{homework.description || 'Описание не указано'}</Text>
        {homework.attachment_url ? (
          <Image source={{ uri: homework.attachment_url }} style={styles.homeworkImage} />
        ) : null}
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

      {previewUri ? (
        <View style={styles.attachmentWrapper}>
          <Image source={{ uri: previewUri }} style={styles.attachmentImage} />
          <View style={styles.attachmentActions}>
            <Text onPress={pickImage} style={styles.attachmentLink}>
              Заменить фото
            </Text>
            <Text onPress={removeAttachment} style={[styles.attachmentLink, styles.attachmentRemove]}>
              Удалить
            </Text>
          </View>
        </View>
      ) : (
        <Text onPress={pickImage} style={styles.pickText}>
          + Прикрепить фото работы
        </Text>
      )}

      <View style={{ height: spacing.md }} />

      <Button
        title={submission ? 'Обновить ответ' : 'Отправить'}
        onPress={onSubmit}
        loading={saving || uploading}
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
  homeworkImage: { width: '100%', aspectRatio: 1.4, borderRadius: radius.md, marginTop: spacing.sm, backgroundColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.sm },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  pickText: {
    color: colors.primary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  attachmentWrapper: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  attachmentImage: { width: '100%', aspectRatio: 1.4, backgroundColor: colors.border },
  attachmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  attachmentLink: { color: colors.primary, fontWeight: '600' },
  attachmentRemove: { color: colors.danger },
  feedbackCard: { marginTop: spacing.lg },
  grade: { fontWeight: '700', color: colors.success, marginBottom: spacing.xs },
});
