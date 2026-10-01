import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import {
  cancelChildLinkRequest,
  fetchChildren,
  fetchParentLinkRequests,
  fetchStudentGroupNames,
  type ParentLinkRequest,
} from '../../lib/parents';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { ParentStackParamList } from '../../navigation/types';

interface ChildRow {
  profile: Profile;
  groups: string[];
}

export function ChildrenScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const { profile } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [requests, setRequests] = useState<ParentLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable hitSlop={10} onPress={() => navigation.navigate('AddChild')} accessibilityLabel="Добавить ребёнка">
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const list = await fetchChildren(profile.id);
      const rows = await Promise.all(
        list.map(async (child) => ({ profile: child, groups: await fetchStudentGroupNames(child.id) }))
      );
      setChildren(rows);
      setRequests(await fetchParentLinkRequests(profile.id).catch(() => []));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {children.length === 0 && requests.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>Пока ни один ребёнок не привязан к вашему аккаунту.</Text>
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddChild')}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.addButtonText}>Добавить ребёнка</Text>
          </Pressable>
        </View>
      ) : null}
      {requests.map((request) => (
        <Card key={request.id} style={styles.row}>
          <Avatar uri={request.student?.avatar_url} name={request.student?.full_name} size={52} />
          <View style={styles.info}>
            <Text style={styles.name}>{request.student?.full_name ?? 'Ученик'}</Text>
            <Text style={styles.pending}>Ждёт подтверждения школы</Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() =>
              Alert.alert('Отозвать заявку?', undefined, [
                { text: 'Нет', style: 'cancel' },
                {
                  text: 'Отозвать',
                  style: 'destructive',
                  onPress: () => cancelChildLinkRequest(request.id).then(load).catch(() => {}),
                },
              ])
            }
          >
            <Text style={styles.cancel}>Отозвать</Text>
          </Pressable>
        </Card>
      ))}
      {children.map(({ profile: child, groups }) => (
        <Pressable key={child.id} onPress={() => navigation.navigate('ChildDetail', { childId: child.id })}>
          <Card style={styles.row}>
            <Avatar uri={child.avatar_url} name={child.full_name} size={52} />
            <View style={styles.info}>
              <Text style={styles.name}>{child.full_name || 'Без имени'}</Text>
              <Text style={styles.groups}>{groups.length > 0 ? groups.join(', ') : 'Не состоит в группах'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  emptyBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  addButtonText: { color: colors.white, fontWeight: '700' },
  pending: { color: colors.warning, marginTop: 2, fontWeight: '600' },
  cancel: { color: colors.danger, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  groups: { color: colors.textMuted, marginTop: 2 },
});
