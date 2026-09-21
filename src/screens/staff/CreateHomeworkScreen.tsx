import React, { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { uploadImageAsset } from '../../lib/storage';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { Homework } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function CreateHomeworkScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<StaffStackParamList, 'CreateHomework'>>();
  const { groupId, homeworkId } = route.params;
  const isEditing = !!homeworkId;
  const { profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [newAsset, setNewAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!homeworkId) return;
      supabase
        .from('homework')
        .select('*')
        .eq('id', homeworkId)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const hw = data as Homework;
          setTitle(hw.title);
          setDescription(hw.description ?? '');
          setDueDate(hw.due_date ?? '');
          setAttachmentUrl(hw.attachment_url);
        });
    }, [homeworkId])
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

  const onSave = async () => {
    if (!profile) return;
    if (!title.trim()) {
      Alert.alert('Укажите название задания');
      return;
    }
    if (dueDate.trim() && !DATE_REGEX.test(dueDate.trim())) {
      Alert.alert('Дату укажите в формате ГГГГ-ММ-ДД, например 2026-10-01');
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

      const payload = {
        group_id: groupId,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate.trim() || null,
        attachment_url: finalAttachmentUrl,
      };
      const { error } = isEditing
        ? await supabase.from('homework').update(payload).eq('id', homeworkId)
        : await supabase.from('homework').insert({ ...payload, created_by: profile.id });
      if (error) throw error;

      navigation.goBack();
    } catch (e) {
      Alert.alert('Не удалось сохранить задание', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Удалить задание?', title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('homework').delete().eq('id', homeworkId);
          navigation.goBack();
        },
      },
    ]);
  };

  const previewUri = newAsset?.uri ?? attachmentUrl;

  return (
    <Screen scroll>
      <Text style={styles.title}>{isEditing ? 'Редактировать задание' : 'Новое домашнее задание'}</Text>

      <TextField label="Название" value={title} onChangeText={setTitle} placeholder="Например: Натюрморт гуашью" />
      <TextField
        label="Описание"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        style={styles.textarea}
      />
      <TextField label="Срок сдачи (ГГГГ-ММ-ДД)" value={dueDate} onChangeText={setDueDate} placeholder="2026-10-01" />

      <Text style={styles.label}>Фото к заданию (необязательно)</Text>
      {previewUri ? (
        <View style={styles.attachmentWrapper}>
          <Image source={{ uri: previewUri }} style={styles.attachmentImage} />
          <View style={styles.attachmentActions}>
            <Text onPress={pickImage} style={styles.attachmentLink}>
              Заменить
            </Text>
            <Text onPress={removeAttachment} style={[styles.attachmentLink, styles.attachmentRemove]}>
              Удалить
            </Text>
          </View>
        </View>
      ) : (
        <Text onPress={pickImage} style={styles.pickText}>
          + Прикрепить фото
        </Text>
      )}

      <View style={{ height: spacing.md }} />

      <Button title={isEditing ? 'Сохранить' : 'Создать'} onPress={onSave} loading={saving || uploading} />

      {isEditing ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title="Удалить задание" variant="danger" onPress={onDelete} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
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
});
