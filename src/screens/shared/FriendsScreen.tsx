import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import {
  acceptFriendRequest,
  blockUser,
  fetchFriendsData,
  friendStateOf,
  removeFriendship,
  searchPeople,
  sendFriendRequest,
  unblockUser,
  type FriendsData,
} from '../../lib/friends';
import { colors, radius, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;
type Section = 'friends' | 'requests' | 'search' | 'blocked';

const EMPTY: FriendsData = { friends: [], incoming: [], outgoing: [], blocked: [] };

interface Action {
  label: string;
  danger?: boolean;
  onPress: () => void;
}

export function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>('friends');
  const [data, setData] = useState<FriendsData>(EMPTY);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setData(await fetchFriendsData(profile.id));
    } catch {
      // Нет сети — потянуть вниз, чтобы повторить.
    }
    setLoading(false);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (section !== 'search' || !profile) return;
    const timer = setTimeout(() => {
      searchPeople(profile.id, query)
        .then(setPeople)
        .catch(() => setPeople([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [section, query, profile]);

  if (!profile) return null;

  const run = async (otherId: string, action: () => Promise<void>) => {
    setBusyId(otherId);
    try {
      await action();
      await load();
    } catch (e) {
      Alert.alert('Не получилось', e instanceof Error ? e.message : undefined);
    }
    setBusyId(null);
  };

  const confirmBlock = (person: Profile) => {
    Alert.alert(
      'Заблокировать?',
      `${person.full_name} не сможет отправлять вам приглашения, а дружба между вами будет удалена.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Заблокировать', style: 'destructive', onPress: () => run(person.id, () => blockUser(profile.id, person.id)) },
      ]
    );
  };

  const actionsFor = (person: Profile): Action[] => {
    switch (friendStateOf(data, person.id)) {
      case 'friends':
        return [
          { label: 'Удалить', onPress: () => run(person.id, () => removeFriendship(profile.id, person.id)) },
          { label: 'Блок', danger: true, onPress: () => confirmBlock(person) },
        ];
      case 'incoming':
        return [
          { label: 'Принять', onPress: () => run(person.id, () => acceptFriendRequest(profile.id, person.id)) },
          { label: 'Отклонить', onPress: () => run(person.id, () => removeFriendship(profile.id, person.id)) },
        ];
      case 'outgoing':
        return [{ label: 'Отменить', onPress: () => run(person.id, () => removeFriendship(profile.id, person.id)) }];
      case 'blocked':
        return [{ label: 'Разблокировать', onPress: () => run(person.id, () => unblockUser(profile.id, person.id)) }];
      default:
        return [
          { label: 'В друзья', onPress: () => run(person.id, () => sendFriendRequest(profile.id, person.id)) },
          { label: 'Блок', danger: true, onPress: () => confirmBlock(person) },
        ];
    }
  };

  const renderPerson = (person: Profile, note?: string) => (
    <Card key={person.id} style={styles.row}>
      <Pressable style={styles.person} onPress={() => navigation.navigate('UserProfile', { userId: person.id })}>
        <Avatar uri={person.avatar_url} name={person.full_name} size={40} />
        <View style={styles.personText}>
          <Text style={styles.name} numberOfLines={1}>
            {person.full_name || 'Без имени'}
          </Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      </Pressable>
      <View style={styles.actions}>
        {actionsFor(person).map((action) => (
          <Pressable
            key={action.label}
            disabled={busyId === person.id}
            onPress={action.onPress}
            style={[styles.action, action.danger && styles.actionDanger, busyId === person.id && styles.actionBusy]}
          >
            <Text style={[styles.actionText, action.danger && styles.actionTextDanger]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );

  const requestsCount = data.incoming.length;
  const sections: { value: Section; label: string }[] = [
    { value: 'friends', label: `Друзья${data.friends.length ? ` ${data.friends.length}` : ''}` },
    { value: 'requests', label: `Заявки${requestsCount ? ` ${requestsCount}` : ''}` },
    { value: 'search', label: 'Найти' },
    { value: 'blocked', label: 'Блок' },
  ];

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <View style={styles.segment}>
        {sections.map(({ value, label }) => (
          <Pressable
            key={value}
            onPress={() => setSection(value)}
            style={[styles.segmentItem, section === value && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, section === value && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {section === 'friends' ? (
        <>
          {data.friends.length === 0 && !loading ? (
            <Text style={styles.empty}>Пока нет друзей. Найдите одноклассников и преподавателей во вкладке «Найти».</Text>
          ) : null}
          {data.friends.map((p) => renderPerson(p))}
        </>
      ) : null}

      {section === 'requests' ? (
        <>
          {data.incoming.length === 0 && data.outgoing.length === 0 && !loading ? (
            <Text style={styles.empty}>Новых приглашений нет</Text>
          ) : null}
          {data.incoming.map((p) => renderPerson(p, 'Приглашает в друзья'))}
          {data.outgoing.map((p) => renderPerson(p, 'Вы пригласили, ждём ответа'))}
        </>
      ) : null}

      {section === 'search' ? (
        <>
          <TextField label="Имя" value={query} onChangeText={setQuery} placeholder="Начните вводить имя" />
          {people.length === 0 ? <Text style={styles.empty}>Никого не нашли</Text> : null}
          {people.map((p) => renderPerson(p, p.role === 'staff' ? 'Преподаватель' : 'Ученик'))}
        </>
      ) : null}

      {section === 'blocked' ? (
        <>
          {data.blocked.length === 0 && !loading ? <Text style={styles.empty}>Вы никого не блокировали</Text> : null}
          {data.blocked.map((p) => renderPerson(p))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md - 2, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: colors.primary },
  row: { gap: spacing.sm },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personText: { flex: 1 },
  name: { fontWeight: '700', color: colors.text },
  note: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionDanger: { borderColor: colors.danger },
  actionBusy: { opacity: 0.5 },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  actionTextDanger: { color: colors.danger },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
