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
import { colors, radius, spacing } from '../../theme/colors';
import { fetchBranches } from '../../lib/materials';
import type { Branch, Group } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    newGroup: '+ Новая группа',
    people: 'Ученики и родители',
    empty: 'Группы ещё не созданы',
    replaceRequest: 'Запрос на замену преподавателя',
    needsReplacement: 'Нужна замена',
    mine: 'Мои',
    all: 'Все',
  },
  kk: {
    newGroup: '+ Жаңа топ',
    people: 'Оқушылар мен ата-аналар',
    empty: 'Топтар әлі құрылмаған',
    replaceRequest: 'Мұғалімді ауыстыру сұранысы',
    needsReplacement: 'Ауыстыру керек',
    mine: 'Менікі',
    all: 'Барлығы',
  },
  en: {
    newGroup: '+ New group',
    people: 'Students and parents',
    empty: 'No groups have been created yet',
    replaceRequest: 'Teacher replacement request',
    needsReplacement: 'Needs a substitute',
    mine: 'Mine',
    all: 'All',
  },
};

export function GroupsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const s = useStrings(STRINGS);
  const { profile } = useAuth();
  // Группы создаёт только администратор (на сервере — политика groups_write_admin).
  const canCreate = isAdminRole(profile?.role);
  const [groups, setGroups] = useState<Group[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  // Открытые запросы по группам: «Нужна замена» видят все сотрудники,
  // запросы к администратору — только он (RLS group_teacher_requests_select).
  const [requests, setRequests] = useState<Map<string, 'replacement' | 'takeover'>>(new Map());
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: pending }, branchList] = await Promise.all([
      supabase.from('groups').select('*'),
      supabase.from('group_teacher_requests').select('group_id, kind').eq('status', 'pending'),
      fetchBranches().catch(() => [] as Branch[]),
    ]);
    const list = ((data as Group[]) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, 'ru', { numeric: true, sensitivity: 'base' })
    );
    setGroups(list);
    setBranches(branchList);
    const map = new Map<string, 'replacement' | 'takeover'>();
    for (const r of (pending as { group_id: string; kind: 'replacement' | 'takeover' }[]) ?? []) {
      if (r.kind === 'replacement' || !map.has(r.group_id)) map.set(r.group_id, r.kind);
    }
    setRequests(map);
    setFilter((prev) => prev ?? (list.some((g) => g.teacher_id === profile?.id) ? 'mine' : 'all'));
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const hasMine = groups.some((g) => g.teacher_id === profile?.id);
  const chips = [
    ...(hasMine ? [{ id: 'mine', name: s.mine }] : []),
    { id: 'all', name: s.all },
    ...branches.filter((b) => groups.some((g) => g.branch_id === b.id)).map((b) => ({ id: b.id, name: b.name })),
  ];
  const visible = groups.filter((g) =>
    filter === 'mine' ? g.teacher_id === profile?.id : filter === 'all' || !filter ? true : g.branch_id === filter
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {canCreate ? <Button title={s.newGroup} onPress={() => navigation.navigate('CreateGroup')} /> : null}
      <View style={{ height: spacing.sm }} />
      <Button title={s.people} variant="secondary" onPress={() => navigation.navigate('People')} />
      <View style={styles.chips}>
        {chips.map((c) => {
          const active = (filter ?? 'all') === c.id;
          return (
            <Pressable key={c.id} onPress={() => setFilter(c.id)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 && !loading ? <Text style={styles.empty}>{s.empty}</Text> : null}
      {visible.map((g) => {
        const req = requests.get(g.id);
        return (
          <Pressable key={g.id} onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })}>
            <Card>
              <Text style={styles.groupName}>{g.name}</Text>
              {g.description ? (
                <Text style={styles.groupDesc} numberOfLines={2}>
                  {g.description}
                </Text>
              ) : null}
              {req ? <Text style={styles.request}>● {req === 'replacement' ? s.needsReplacement : s.replaceRequest}</Text> : null}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  groupName: { fontSize: 16, fontWeight: '700', color: colors.text },
  groupDesc: { color: colors.textMuted, marginTop: spacing.xs },
  request: { color: colors.danger, marginTop: spacing.xs, fontWeight: '600', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
});
