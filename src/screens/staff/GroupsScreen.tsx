import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../../lib/roles';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../theme/colors';
import type { Group } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    newGroup: '+ Новая группа',
    people: 'Ученики и родители',
    empty: 'Группы ещё не созданы',
    replaceRequest: 'Запрос на замену преподавателя',
  },
  kk: {
    newGroup: '+ Жаңа топ',
    people: 'Оқушылар мен ата-аналар',
    empty: 'Топтар әлі құрылмаған',
    replaceRequest: 'Мұғалімді ауыстыру сұранысы',
  },
  en: {
    newGroup: '+ New group',
    people: 'Students and parents',
    empty: 'No groups have been created yet',
    replaceRequest: 'Teacher replacement request',
  },
};

export function GroupsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const s = useStrings(STRINGS);
  const { profile } = useAuth();
  // Группы создаёт только администратор (на сервере — политика groups_write_admin).
  const canCreate = isAdminRole(profile?.role);
  const [groups, setGroups] = useState<Group[]>([]);
  // Группы с открытыми запросами на замену преподавателя (видит администратор).
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('groups').select('*').order('name');
    setGroups((data as Group[]) ?? []);
    if (canCreate) {
      const { data: requests } = await supabase.from('group_teacher_requests').select('group_id').eq('status', 'pending');
      setRequested(new Set(((requests as { group_id: string }[]) ?? []).map((r) => r.group_id)));
    }
    setLoading(false);
  }, [canCreate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {canCreate ? <Button title={s.newGroup} onPress={() => navigation.navigate('CreateGroup')} /> : null}
      <View style={{ height: spacing.sm }} />
      <Button title={s.people} variant="secondary" onPress={() => navigation.navigate('People')} />
      <View style={{ height: spacing.md }} />

      {groups.length === 0 && !loading ? <Text style={styles.empty}>{s.empty}</Text> : null}
      {groups.map((g) => (
        <Pressable key={g.id} onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })}>
          <Card>
            <Text style={styles.groupName}>{g.name}</Text>
            {g.description ? <Text style={styles.groupDesc}>{g.description}</Text> : null}
            {requested.has(g.id) ? <Text style={styles.request}>● {s.replaceRequest}</Text> : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  groupName: { fontSize: 16, fontWeight: '700', color: colors.text },
  groupDesc: { color: colors.textMuted, marginTop: spacing.xs },
  request: { color: colors.danger, marginTop: spacing.xs, fontWeight: '600', fontSize: 13 },
});
