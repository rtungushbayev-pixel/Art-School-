import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { fetchStudentsNotLinked, requestChildLink } from '../../lib/parents';
import { colors, radius, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { ParentStackParamList } from '../../navigation/types';

// Родитель находит ребёнка по имени и отправляет заявку. Доступ к успехам
// ребёнка откроется, когда школа подтвердит, что это действительно его ребёнок.
export function AddChildScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Profile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || query.trim().length < 2) {
      setStudents([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchStudentsNotLinked(profile.id, query)
        .then((list) => setStudents(list.slice(0, 30)))
        .catch(() => setStudents([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, profile]);

  if (!profile) return null;

  const onRequest = async (student: Profile) => {
    setBusyId(student.id);
    try {
      await requestChildLink(profile.id, student.id);
      Alert.alert(
        'Заявка отправлена',
        `Когда администрация школы подтвердит, что ${student.full_name} — ваш ребёнок, вы увидите его успехи и работы.`
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Не получилось', e instanceof Error ? e.message : undefined);
    }
    setBusyId(null);
  };

  return (
    <Screen scroll>
      <Text style={styles.hint}>Введите имя или фамилию ребёнка, как он указан в приложении.</Text>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Имя ребёнка"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoFocus
        />
      </View>

      {query.trim().length >= 2 && students.length === 0 ? (
        <Text style={styles.empty}>
          Никого не нашли. Возможно, ребёнок ещё не зарегистрирован в приложении.
        </Text>
      ) : null}

      {students.map((student) => (
        <View key={student.id} style={styles.row}>
          <Avatar uri={student.avatar_url} name={student.full_name} size={48} />
          <Text style={styles.name} numberOfLines={1}>
            {student.full_name}
          </Text>
          <Pressable
            onPress={() => onRequest(student)}
            disabled={busyId !== null}
            style={[styles.button, busyId === student.id && styles.busy]}
          >
            <Text style={styles.buttonText}>Это мой ребёнок</Text>
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, marginBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 4, fontSize: 16, color: colors.text },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  busy: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '700' },
});
