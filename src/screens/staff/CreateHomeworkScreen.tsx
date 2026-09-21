import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function CreateHomeworkScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<StaffStackParamList, 'CreateHomework'>>();
  const { groupId } = route.params;
  const { profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Укажите название задания');
      return;
    }
    if (dueDate.trim() && !DATE_REGEX.test(dueDate.trim())) {
      Alert.alert('Дату укажите в формате ГГГГ-ММ-ДД, например 2026-10-01');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('homework').insert({
      group_id: groupId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось создать задание', error.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Новое домашнее задание</Text>

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

      <Button title="Создать" onPress={onCreate} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
});
