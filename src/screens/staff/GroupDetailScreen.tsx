import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { supabase } from '../../lib/supabase';
import { fetchGroupMembers, removeStudentFromGroup } from '../../lib/groups';
import { colors, spacing } from '../../theme/colors';
import type { Group, Lesson, Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StaffStackParamList, 'GroupDetail'>;

const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function GroupDetailScreen({ route }: Props) {
  const { groupId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const load = useCallback(async () => {
    const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
    setGroup(groupData as Group);

    const [membersList, { data: lessonRows }] = await Promise.all([
      fetchGroupMembers(groupId),
      supabase
        .from('lessons')
        .select('*')
        .eq('group_id', groupId)
        .order('day_of_week')
        .order('start_time'),
    ]);

    setMembers(membersList);
    setLessons((lessonRows as Lesson[]) ?? []);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRemoveMember = (student: Profile) => {
    Alert.alert('Убрать из группы?', student.full_name, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Убрать',
        style: 'destructive',
        onPress: async () => {
          await removeStudentFromGroup(groupId, student.id);
          load();
        },
      },
    ]);
  };

  if (!group) {
    return (
      <Screen>
        <Text style={styles.empty}>Загрузка…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{group.name}</Text>
      {group.description ? <Text style={styles.description}>{group.description}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ученики ({members.length})</Text>
        <Pressable onPress={() => navigation.navigate('AddStudentToGroup', { groupId })}>
          <Text style={styles.addLink}>+ Добавить</Text>
        </Pressable>
      </View>
      {members.length === 0 ? <Text style={styles.empty}>В группе пока нет учеников</Text> : null}
      {members.map((m) => (
        <Card key={m.id} style={styles.memberRow}>
          <Avatar uri={m.avatar_url} name={m.full_name} size={36} />
          <Text style={styles.memberName}>{m.full_name}</Text>
          <Pressable onPress={() => onRemoveMember(m)}>
            <Text style={styles.remove}>Убрать</Text>
          </Pressable>
        </Card>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Расписание</Text>
        <Pressable onPress={() => navigation.navigate('CreateLesson', { groupId })}>
          <Text style={styles.addLink}>+ Добавить</Text>
        </Pressable>
      </View>
      {lessons.length === 0 ? <Text style={styles.empty}>Занятий пока нет</Text> : null}
      {lessons.map((l) => (
        <Pressable key={l.id} onPress={() => navigation.navigate('CreateLesson', { groupId, lessonId: l.id })}>
          <Card style={styles.lessonRow}>
            <Text style={styles.lessonDay}>{DAY_NAMES[l.day_of_week]}</Text>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>{l.title}</Text>
              <Text style={styles.lessonMeta}>
                {l.start_time.slice(0, 5)}–{l.end_time.slice(0, 5)}
                {l.room ? ` · каб. ${l.room}` : ''}
              </Text>
            </View>
            <Text style={styles.editIcon}>✏️</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  description: { color: colors.textMuted, marginBottom: spacing.md },
  empty: { color: colors.textMuted, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  addLink: { color: colors.primary, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { flex: 1, fontWeight: '600', color: colors.text },
  remove: { color: colors.danger, fontWeight: '600' },
  lessonRow: { flexDirection: 'row', alignItems: 'center' },
  lessonDay: { width: 32, fontWeight: '700', color: colors.primary },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  lessonMeta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  editIcon: { fontSize: 16, marginLeft: spacing.sm },
});
