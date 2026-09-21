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

export function CreateGroupScreen() {
  const navigation = useNavigation();
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
      Alert.alert('Укажите название группы');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: description.trim() || null, teacher_id: teacherId });
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось создать группу', error.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Новая группа</Text>

      <TextField label="Название" value={name} onChangeText={setName} placeholder="Например: Живопись, 2 курс" />
      <TextField label="Описание" value={description} onChangeText={setDescription} multiline />

      {teachers.length > 0 ? (
        <>
          <Text style={styles.label}>Преподаватель</Text>
          <View style={styles.teacherList}>
            <Pressable
              onPress={() => setTeacherId(null)}
              style={[styles.teacherOption, teacherId === null && styles.teacherOptionActive]}
            >
              <Text style={[styles.teacherText, teacherId === null && styles.teacherTextActive]}>Не назначен</Text>
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

      <Button title="Создать" onPress={onCreate} loading={saving} />
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
