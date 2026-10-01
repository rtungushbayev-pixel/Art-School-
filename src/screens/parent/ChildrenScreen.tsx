import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { fetchChildren, fetchStudentGroupNames } from '../../lib/parents';
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const list = await fetchChildren(profile.id);
      const rows = await Promise.all(
        list.map(async (child) => ({ profile: child, groups: await fetchStudentGroupNames(child.id) }))
      );
      setChildren(rows);
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
      {children.length === 0 && !loading ? (
        <Text style={styles.empty}>
          Пока ни один ребёнок не привязан к вашему аккаунту. Обратитесь к администрации школы.
        </Text>
      ) : null}
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
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  groups: { color: colors.textMuted, marginTop: 2 },
});
