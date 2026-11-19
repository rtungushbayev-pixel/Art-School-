import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { fetchStaffProfiles } from '../../lib/groups';
import { colors, radius, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    needName: 'Укажите название группы',
    createFailed: 'Не удалось создать группу',
    title: 'Новая группа',
    name: 'Название',
    namePlaceholder: 'Например: Живопись, 2 курс',
    description: 'Описание',
    teacher: 'Преподаватель',
    notAssigned: 'Не назначен',
    create: 'Создать',
  },
  kk: {
    needName: 'Топтың атауын көрсетіңіз',
    createFailed: 'Топты құру мүмкін болмады',
    title: 'Жаңа топ',
    name: 'Атауы',
    namePlaceholder: 'Мысалы: Кескіндеме, 2-курс',
    description: 'Сипаттама',
    teacher: 'Мұғалім',
    notAssigned: 'Тағайындалмаған',
    create: 'Құру',
  },
  en: {
    needName: 'Enter a group name',
    createFailed: 'Could not create the group',
    title: 'New group',
    name: 'Name',
    namePlaceholder: 'For example: Painting, year 2',
    description: 'Description',
    teacher: 'Teacher',
    notAssigned: 'Not assigned',
    create: 'Create',
  },
};

export function CreateGroupScreen() {
  const navigation = useNavigation();
  const s = useStrings(STRINGS);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaffProfiles()
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, []);

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert(s.needName);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: description.trim() || null, teacher_id: teacherId });
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

      {teachers.length > 0 ? (
        <>
          <Text style={styles.label}>{s.teacher}</Text>
          <View style={styles.teacherList}>
            <Pressable
              onPress={() => setTeacherId(null)}
              style={[styles.teacherOption, teacherId === null && styles.teacherOptionActive]}
            >
              <Text style={[styles.teacherText, teacherId === null && styles.teacherTextActive]}>{s.notAssigned}</Text>
            </Pressable>
            {teachers.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTeacherId(t.id)}
                style={[styles.teacherOption, teacherId === t.id && styles.teacherOptionActive]}
              >
                <Text style={[styles.teacherText, teacherId === t.id && styles.teacherTextActive]}>
                  {t.full_name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Button title={s.create} onPress={onCreate} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  teacherList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  teacherOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  teacherOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  teacherText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  teacherTextActive: { color: colors.white },
});
