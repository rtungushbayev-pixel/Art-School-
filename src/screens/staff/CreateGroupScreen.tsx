import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../theme/colors';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    needName: 'Укажите название группы',
    createFailed: 'Не удалось создать группу',
    title: 'Новая группа',
    name: 'Название',
    namePlaceholder: 'Например: Живопись, 2 курс',
    description: 'Описание',
    create: 'Создать',
  },
  kk: {
    needName: 'Топтың атауын көрсетіңіз',
    createFailed: 'Топты құру мүмкін болмады',
    title: 'Жаңа топ',
    name: 'Атауы',
    namePlaceholder: 'Мысалы: Кескіндеме, 2-курс',
    description: 'Сипаттама',
    create: 'Құру',
  },
  en: {
    needName: 'Enter a group name',
    createFailed: 'Could not create the group',
    title: 'New group',
    name: 'Name',
    namePlaceholder: 'For example: Painting, year 2',
    description: 'Description',
    create: 'Create',
  },
};

export function CreateGroupScreen() {
  const navigation = useNavigation();
  const s = useStrings(STRINGS);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);


  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert(s.needName);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: description.trim() || null });
    setSaving(false);
    if (error) {
      Alert.alert(s.createFailed, error.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{s.title}</Text>

      <TextField label={s.name} value={name} onChangeText={setName} placeholder={s.namePlaceholder} />
      <TextField label={s.description} value={description} onChangeText={setDescription} multiline />

      <Button title={s.create} onPress={onCreate} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
});
