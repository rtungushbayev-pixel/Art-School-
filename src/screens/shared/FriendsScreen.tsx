import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import {
  acceptFriendRequest,
  blockUser,
  fetchFriendSuggestions,
  fetchFriendsData,
  friendStateOf,
  removeFriendship,
  searchPeople,
  sendFriendRequest,
  unblockUser,
  type FriendSuggestion,
  type FriendsData,
} from '../../lib/friends';
import { colors, radius, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const EMPTY: FriendsData = { friends: [], incoming: [], outgoing: [], blocked: [] };

function pluralFriends(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} общий друг`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} общих друга`;
  return `${n} общих друзей`;
}

export function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'Friends'>>();
  const showBlocked = !!route.params?.showBlocked;
  const { profile } = useAuth();
  const [data, setData] = useState<FriendsData>(EMPTY);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: showBlocked ? 'Заблокированные' : 'Друзья',
      headerRight: showBlocked
        ? undefined
        : () => (
            <Pressable hitSlop={8} onPress={() => navigation.push('Friends', { showBlocked: true })}>
              <Text style={styles.headerLink}>Заблокированные</Text>
            </Pressable>
          ),
    });
  }, [navigation, showBlocked]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [friendsData, suggested] = await Promise.all([
        fetchFriendsData(profile.id),
        showBlocked ? Promise.resolve([]) : fetchFriendSuggestions().catch(() => []),
      ]);
      setData(friendsData);
      setSuggestions(suggested);
    } catch {
      // Нет сети — потянуть вниз, чтобы повторить.
    }
    setLoading(false);
  }, [profile, showBlocked]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!profile || !query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchPeople(profile.id, query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, profile]);

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

  const openProfile = (person: Profile) => navigation.navigate('UserProfile', { userId: person.id });

  const confirmBlock = (person: Profile) => {
    Alert.alert(
      'Заблокировать?',
      `${person.full_name} не сможет отправлять вам приглашения, а дружба между вами будет удалена.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Заблокировать',
          style: 'destructive',
          onPress: () => run(person.id, () => blockUser(profile.id, person.id)),
        },
      ]
    );
  };

  const friendMenu = (person: Profile) => {
    Alert.alert(person.full_name, undefined, [
      { text: 'Открыть профиль', onPress: () => openProfile(person) },
      { text: 'Удалить из друзей', onPress: () => run(person.id, () => removeFriendship(profile.id, person.id)) },
      { text: 'Заблокировать', style: 'destructive', onPress: () => confirmBlock(person) },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const add = (person: Profile) => run(person.id, () => sendFriendRequest(profile.id, person.id));

  const personHead = (person: Profile, note?: string) => (
    <Pressable style={styles.person} onPress={() => openProfile(person)}>
      <Avatar uri={person.avatar_url} name={person.full_name} size={52} />
      <View style={styles.personText}>
        <Text style={styles.name} numberOfLines={1}>
          {person.full_name || 'Без имени'}
        </Text>
        {note ? (
          <Text style={styles.note} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  const pill = (label: string, onPress: () => void, kind: 'primary' | 'muted', personId: string) => (
    <Pressable
      onPress={onPress}
      disabled={busyId === personId}
      style={[styles.pill, kind === 'primary' ? styles.pillPrimary : styles.pillMuted, busyId === personId && styles.busy]}
    >
      <Text style={[styles.pillText, kind === 'primary' && styles.pillTextPrimary]}>{label}</Text>
    </Pressable>
  );

  // Строка результата поиска: действие зависит от того, кто это для меня.
  const searchRow = (person: Profile) => {
    const state = friendStateOf(data, person.id);
    const note = person.role === 'staff' ? 'Преподаватель' : 'Ученик';
    return (
      <View key={person.id} style={styles.row}>
        {personHead(person, note)}
        {state === 'none' ? pill('Добавить', () => add(person), 'primary', person.id) : null}
        {state === 'incoming'
          ? pill('Принять', () => run(person.id, () => acceptFriendRequest(profile.id, person.id)), 'primary', person.id)
          : null}
        {state === 'outgoing' ? <Text style={styles.stateText}>Заявка отправлена</Text> : null}
        {state === 'friends' ? <Text style={styles.stateText}>В друзьях</Text> : null}
        {state === 'blocked'
          ? pill('Разблокировать', () => run(person.id, () => unblockUser(profile.id, person.id)), 'muted', person.id)
          : null}
      </View>
    );
  };

  if (showBlocked) {
    return (
      <Screen scroll refreshing={loading} onRefresh={load}>
        {data.blocked.length === 0 && !loading ? <Text style={styles.empty}>Вы никого не блокировали</Text> : null}
        {data.blocked.map((person) => (
          <View key={person.id} style={styles.row}>
            {personHead(person)}
            {pill('Разблокировать', () => run(person.id, () => unblockUser(profile.id, person.id)), 'muted', person.id)}
          </View>
        ))}
      </Screen>
    );
  }

  const searching = query.trim().length > 0;

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoFocus={!!route.params?.focusSearch}
          returnKeyType="search"
        />
        {searching ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        <>
          {results.length === 0 ? <Text style={styles.empty}>Никого не нашли</Text> : null}
          {results.map(searchRow)}
        </>
      ) : (
        <>
          {data.incoming.length > 0 || data.outgoing.length > 0 ? (
            <>
              <Text style={styles.section}>Запросы</Text>
              {data.incoming.map((person) => (
                <View key={person.id} style={styles.requestRow}>
                  <Avatar uri={person.avatar_url} name={person.full_name} size={52} />
                  <View style={styles.requestBody}>
                    <Pressable onPress={() => openProfile(person)}>
                      <Text style={styles.name}>{person.full_name}</Text>
                      <Text style={styles.note}>Отправил(-а) заявку в друзья</Text>
                    </Pressable>
                    <View style={styles.requestButtons}>
                      <Pressable
                        disabled={busyId === person.id}
                        onPress={() => run(person.id, () => acceptFriendRequest(profile.id, person.id))}
                        style={[styles.bigButton, styles.pillPrimary, busyId === person.id && styles.busy]}
                      >
                        <Text style={[styles.bigButtonText, styles.pillTextPrimary]}>Добавить</Text>
                      </Pressable>
                      <Pressable
                        disabled={busyId === person.id}
                        onPress={() => run(person.id, () => removeFriendship(profile.id, person.id))}
                        style={[styles.bigButton, styles.pillMuted, busyId === person.id && styles.busy]}
                      >
                        <Text style={styles.bigButtonText}>Отклонить</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
              {data.outgoing.map((person) => (
                <View key={person.id} style={styles.row}>
                  {personHead(person, 'Вы отправили заявку')}
                  {pill('Отменить', () => run(person.id, () => removeFriendship(profile.id, person.id)), 'muted', person.id)}
                </View>
              ))}
            </>
          ) : null}

          {suggestions.length > 0 ? (
            <>
              <Text style={styles.section}>Возможно, вы их знаете</Text>
              {suggestions.map(({ profile: person, mutualFriends, sameGroup }) => (
                <View key={person.id} style={styles.row}>
                  {personHead(
                    person,
                    [sameGroup ? 'Из вашей группы' : null, mutualFriends > 0 ? pluralFriends(mutualFriends) : null]
                      .filter(Boolean)
                      .join(' · ')
                  )}
                  {pill('Добавить', () => add(person), 'primary', person.id)}
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>Друзья</Text>
          {data.friends.length === 0 && !loading ? (
            <Text style={styles.emptyLeft}>Пока нет друзей. Найдите одноклассников и преподавателей через поиск.</Text>
          ) : null}
          {data.friends.map((person) => (
            <View key={person.id} style={styles.row}>
              {personHead(person)}
              {pill('Профиль', () => openProfile(person), 'muted', person.id)}
              <Pressable onPress={() => friendMenu(person)} hitSlop={10} style={styles.more}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
              </Pressable>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerLink: { color: colors.primary, fontWeight: '600', fontSize: 15 },
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
  section: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  note: { color: colors.textMuted, marginTop: 2 },
  requestRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  requestBody: { flex: 1 },
  requestButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  bigButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2, borderRadius: radius.md },
  bigButtonText: { fontSize: 16, fontWeight: '700', color: colors.text },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  pillPrimary: { backgroundColor: colors.primary },
  pillMuted: { backgroundColor: colors.surfaceAlt },
  pillText: { fontWeight: '700', color: colors.text },
  pillTextPrimary: { color: colors.white },
  busy: { opacity: 0.5 },
  stateText: { color: colors.textMuted, fontWeight: '600' },
  more: { paddingHorizontal: spacing.xs },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  emptyLeft: { color: colors.textMuted },
});
