import React, { useCallback, useState } from 'react';
import { FEATURES } from '../../lib/features';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { RosterSection } from '../../components/RosterSection';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../../lib/roles';
import { supabase } from '../../lib/supabase';
import { fetchGroupMembers, removeStudentFromGroup } from '../../lib/groups';
import { dayShort } from '../../lib/schedule';
import { colors, spacing } from '../../theme/colors';
import type { Group, Lesson, Profile } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    attendance: 'Отметить посещаемость',
    removeTitle: 'Убрать из группы?',
    cancel: 'Отмена',
    remove: 'Убрать',
    loading: 'Загрузка…',
    students: (count: number) => `Ученики (${count})`,
    add: '+ Добавить',
    noStudents: 'В группе пока нет учеников',
    chargeGroup: '₸ Начислить оплату всей группе',
    schedule: 'Расписание',
    noLessons: 'Занятий пока нет',
    room: (room: string) => ` · каб. ${room}`,
  },
  kk: {
    attendance: 'Қатысуды белгілеу',
    removeTitle: 'Топтан шығару керек пе?',
    cancel: 'Бас тарту',
    remove: 'Шығару',
    loading: 'Жүктелуде…',
    students: (count: number) => `Оқушылар (${count})`,
    add: '+ Қосу',
    noStudents: 'Топта әзірге оқушылар жоқ',
    chargeGroup: '₸ Бүкіл топқа төлем есептеу',
    schedule: 'Кесте',
    noLessons: 'Әзірге сабақтар жоқ',
    room: (room: string) => ` · ${room} каб.`,
  },
  en: {
    attendance: 'Take attendance',
    removeTitle: 'Remove from the group?',
    cancel: 'Cancel',
    remove: 'Remove',
    loading: 'Loading…',
    students: (count: number) => `Students (${count})`,
    add: '+ Add',
    noStudents: 'No students in the group yet',
    chargeGroup: '₸ Charge the whole group',
    schedule: 'Schedule',
    noLessons: 'No classes yet',
    room: (room: string) => ` · room ${room}`,
  },
};

type Props = NativeStackScreenProps<StaffStackParamList, 'GroupDetail'>;

export function GroupDetailScreen({ route }: Props) {
  const { groupId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const s = useStrings(STRINGS);

  const [group, setGroup] = useState<Group | null>(null);
  const { profile } = useAuth();
  // Состав, занятия и коды меняет администратор или преподаватель этой группы
  // (на сервере — can_manage_group).
  // Состав группы меняет только администратор (group_members_write_admin).
  const isAdmin = isAdminRole(profile?.role);
  const canManage = isAdmin || (!!group && group.teacher_id === profile?.id);
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
    Alert.alert(s.removeTitle, student.full_name, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.remove,
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
        <Text style={styles.empty}>{s.loading}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{group.name}</Text>
      {group.description ? <Text style={styles.description}>{group.description}</Text> : null}
      {canManage && members.length > 0 ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button
            title={s.attendance}
            onPress={() => navigation.navigate('Attendance', { groupId, groupName: group.name })}
          />
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{s.students(members.length)}</Text>
        {isAdmin ? (
          <Pressable onPress={() => navigation.navigate('AddStudentToGroup', { groupId })}>
            <Text style={styles.addLink}>{s.add}</Text>
          </Pressable>
        ) : null}
      </View>
      {members.length === 0 ? <Text style={styles.empty}>{s.noStudents}</Text> : null}
      {members.map((m) => (
        <Card key={m.id} style={styles.memberRow}>
          <Pressable
            style={styles.memberLink}
            onPress={() => navigation.navigate('UserProfile', { userId: m.id })}
          >
            <Avatar uri={m.avatar_url} name={m.full_name} size={36} />
            <Text style={styles.memberName}>{m.full_name}</Text>
          </Pressable>
          {isAdmin ? (
            <Pressable onPress={() => onRemoveMember(m)}>
              <Text style={styles.remove}>{s.remove}</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
      {FEATURES.payments && members.length > 0 ? (
        <Pressable onPress={() => navigation.navigate('BillingEntryForm', { groupId, kind: 'charge' })}>
          <Text style={styles.addLink}>{s.chargeGroup}</Text>
        </Pressable>
      ) : null}

      {canManage ? <RosterSection groupId={groupId} /> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{s.schedule}</Text>
        <Pressable onPress={() => navigation.navigate('CreateLesson', { groupId })}>
          <Text style={styles.addLink}>{s.add}</Text>
        </Pressable>
      </View>
      {lessons.length === 0 ? <Text style={styles.empty}>{s.noLessons}</Text> : null}
      {lessons.map((l) => (
        <Pressable key={l.id} onPress={() => navigation.navigate('CreateLesson', { groupId, lessonId: l.id })}>
          <Card style={styles.lessonRow}>
            <Text style={styles.lessonDay}>{dayShort(l.day_of_week)}</Text>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>{l.title}</Text>
              <Text style={styles.lessonMeta}>
                {l.start_time.slice(0, 5)}–{l.end_time.slice(0, 5)}
                {l.room ? s.room(l.room) : ''}
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
  memberLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  remove: { color: colors.danger, fontWeight: '600' },
  lessonRow: { flexDirection: 'row', alignItems: 'center' },
  lessonDay: { width: 32, fontWeight: '700', color: colors.primary },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  lessonMeta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  editIcon: { fontSize: 16, marginLeft: spacing.sm },
});
