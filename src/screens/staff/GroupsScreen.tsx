import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme/colors';
import type { Group } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

export function GroupsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('groups').select('*').order('name');
    setGroups((data as Group[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>Группы</Text>
      <Pressable style={styles.createButton} onPress={() => navigation.navigate('CreateGroup')}>
        <Text style={styles.createButtonText}>+ Новая группа</Text>
      </Pressable>

      {groups.length === 0 && !loading ? <Text style={styles.empty}>Группы ещё не созданы</Text> : null}
      {groups.map((g) => (
        <Pressable key={g.id} onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })}>
          <Card>
            <Text style={styles.groupName}>{g.name}</Text>
            {g.description ? <Text style={styles.groupDesc}>{g.description}</Text> : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createButtonText: { color: colors.white, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  groupName: { fontSize: 16, fontWeight: '700', color: colors.text },
  groupDesc: { color: colors.textMuted, marginTop: spacing.xs },
});
