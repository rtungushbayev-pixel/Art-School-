import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { searchProfiles } from '../../lib/parents';
import { colors, radius, spacing } from '../../theme/colors';
import type { Profile, UserRole } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Ученик',
  staff: 'Сотрудник',
  parent: 'Родитель',
};

// Поиск любого пользователя: отсюда сотрудник открывает профиль, чтобы
// назначить роль родителя, привязать детей или оставить отзыв о прогрессе.
export function PeopleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPeople(await searchProfiles(query));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <TextField placeholder="Поиск по имени…" value={query} onChangeText={setQuery} autoCapitalize="none" />
      {people.length === 0 && !loading ? <Text style={styles.empty}>Никого не найдено</Text> : null}
      {people.map((person) => (
        <Pressable key={person.id} onPress={() => navigation.navigate('UserProfile', { userId: person.id })}>
          <Card style={styles.row}>
            <Avatar uri={person.avatar_url} name={person.full_name} size={36} />
            <Text style={styles.name}>{person.full_name || 'Без имени'}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{ROLE_LABELS[person.role]}</Text>
            </View>
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
  rolePill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  roleText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
});
