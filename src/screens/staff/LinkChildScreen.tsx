import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { fetchStudentsNotLinked, linkChild } from '../../lib/parents';
import { colors, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

export function LinkChildScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'LinkChild'>>();
  const { parentId } = route.params;
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStudents(await fetchStudentsNotLinked(parentId, query));
    } finally {
      setLoading(false);
    }
  }, [parentId, query]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const onLink = async (student: Profile) => {
    try {
      await linkChild(parentId, student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (e) {
      Alert.alert('Не удалось привязать', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <TextField placeholder="Поиск ученика по имени…" value={query} onChangeText={setQuery} autoCapitalize="none" />
      {students.length === 0 && !loading ? <Text style={styles.empty}>Никого не найдено</Text> : null}
      {students.map((student) => (
        <Pressable key={student.id} onPress={() => onLink(student)}>
          <Card style={styles.row}>
            <Avatar uri={student.avatar_url} name={student.full_name} size={36} />
            <Text style={styles.name}>{student.full_name}</Text>
            <Text style={styles.addLabel}>+ Привязать</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontWeight: '600', color: colors.text },
  addLabel: { color: colors.primary, fontWeight: '700' },
});
