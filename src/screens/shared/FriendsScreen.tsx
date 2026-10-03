import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { errorText } from '../../lib/errors';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
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

const STRINGS = {
  ru: {
    blockedTitle: 'Заблокированные',
    friends: 'Друзья',
    failed: 'Не получилось',
    blockQ: 'Заблокировать?',
    blockText: (name: string) => `${name} не сможет отправлять вам приглашения, а дружба между вами будет удалена.`,
    cancel: 'Отмена',
    block: 'Заблокировать',
    openProfile: 'Открыть профиль',
    unfriend: 'Удалить из друзей',
    noName: 'Без имени',
    teacher: 'Преподаватель',
    student: 'Ученик',
    add: 'Добавить',
    accept: 'Принять',
    requestSent: 'Заявка отправлена',
    isFriend: 'В друзьях',
    unblock: 'Разблокировать',
    noBlocked: 'Вы никого не блокировали',
    search: 'Поиск',
    nothingFound: 'Никого не нашли',
    requests: 'Запросы',
    sentYouRequest: 'Отправил(-а) заявку в друзья',
    decline: 'Отклонить',
    youSentRequest: 'Вы отправили заявку',
    cancelRequest: 'Отменить',
    suggestions: 'Возможно, вы их знаете',
    sameGroup: 'Из вашей группы',
    mutualFriends: pluralFriends,
    noFriends: 'Пока нет друзей. Найдите одноклассников и преподавателей через поиск.',
    profile: 'Профиль',
  },
  kk: {
    blockedTitle: 'Бұғатталғандар',
    friends: 'Достар',
    failed: 'Сәтсіз аяқталды',
    blockQ: 'Бұғаттау керек пе?',
    blockText: (name: string) =>
      `${name} сізге шақыру жібере алмайды, ал араларыңыздағы достық жойылады.`,
    cancel: 'Бас тарту',
    block: 'Бұғаттау',
    openProfile: 'Профильді ашу',
    unfriend: 'Достардан шығару',
    noName: 'Аты жоқ',
    teacher: 'Мұғалім',
    student: 'Оқушы',
    add: 'Қосу',
    accept: 'Қабылдау',
    requestSent: 'Сұраныс жіберілді',
    isFriend: 'Достарыңызда',
    unblock: 'Бұғаттан шығару',
    noBlocked: 'Сіз ешкімді бұғаттамадыңыз',
    search: 'Іздеу',
    nothingFound: 'Ешкім табылмады',
    requests: 'Сұраныстар',
    sentYouRequest: 'Достыққа сұраныс жіберді',
    decline: 'Қабылдамау',
    youSentRequest: 'Сіз сұраныс жібердіңіз',
    cancelRequest: 'Болдырмау',
    suggestions: 'Мүмкін, сіз оларды танитын шығарсыз',
    sameGroup: 'Сіздің тобыңыздан',
    mutualFriends: (n: number) => `${n} ортақ дос`,
    noFriends: 'Әзірге достар жоқ. Сыныптастарыңыз бен мұғалімдерді іздеу арқылы табыңыз.',
    profile: 'Профиль',
  },
  en: {
    blockedTitle: 'Blocked',
    friends: 'Friends',
    failed: 'Something went wrong',
    blockQ: 'Block?',
    blockText: (name: string) =>
      `${name} will not be able to send you invitations, and your friendship will be removed.`,
    cancel: 'Cancel',
    block: 'Block',
    openProfile: 'Open profile',
    unfriend: 'Remove from friends',
    noName: 'No name',
    teacher: 'Teacher',
    student: 'Student',
    add: 'Add',
    accept: 'Accept',
    requestSent: 'Request sent',
    isFriend: 'Friends',
    unblock: 'Unblock',
    noBlocked: 'You have not blocked anyone',
    search: 'Search',
    nothingFound: 'No one found',
    requests: 'Requests',
    sentYouRequest: 'Sent you a friend request',
    decline: 'Decline',
    youSentRequest: 'You sent a request',
    cancelRequest: 'Cancel',
    suggestions: 'People you may know',
    sameGroup: 'From your group',
    mutualFriends: (n: number) => (n === 1 ? '1 mutual friend' : `${n} mutual friends`),
    noFriends: 'No friends yet. Find classmates and teachers using search.',
    profile: 'Profile',
  },
};

export function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'Friends'>>();
  const showBlocked = !!route.params?.showBlocked;
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [data, setData] = useState<FriendsData>(EMPTY);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: showBlocked ? s.blockedTitle : s.friends,
      headerRight: showBlocked
        ? undefined
        : () => (
            <Pressable hitSlop={8} onPress={() => navigation.push('Friends', { showBlocked: true })}>
              <Text style={styles.headerLink}>{s.blockedTitle}</Text>
            </Pressable>
          ),
    });
  }, [navigation, showBlocked, s]);

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
      Alert.alert(s.failed, errorText(e));
    }
    setBusyId(null);
  };

  const openProfile = (person: Profile) => navigation.navigate('UserProfile', { userId: person.id });

  const confirmBlock = (person: Profile) => {
    Alert.alert(
      s.blockQ,
      s.blockText(person.full_name),
      [
        { text: s.cancel, style: 'cancel' },
        {
          text: s.block,
          style: 'destructive',
          onPress: () => run(person.id, () => blockUser(profile.id, person.id)),
        },
      ]
    );
  };

  const friendMenu = (person: Profile) => {
    Alert.alert(person.full_name, undefined, [
      { text: s.openProfile, onPress: () => openProfile(person) },
      { text: s.unfriend, onPress: () => run(person.id, () => removeFriendship(profile.id, person.id)) },
      { text: s.block, style: 'destructive', onPress: () => confirmBlock(person) },
      { text: s.cancel, style: 'cancel' },
    ]);
  };

  const add = (person: Profile) => run(person.id, () => sendFriendRequest(profile.id, person.id));

  const personHead = (person: Profile, note?: string) => (
    <Pressable style={styles.person} onPress={() => openProfile(person)}>
      <Avatar uri={person.avatar_url} name={person.full_name} size={52} />
      <View style={styles.personText}>
        <Text style={styles.name} numberOfLines={1}>
          {person.full_name || s.noName}
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
    const note = person.role === 'staff' ? s.teacher : s.student;
    return (
      <View key={person.id} style={styles.row}>
        {personHead(person, note)}
        {state === 'none' ? pill(s.add, () => add(person), 'primary', person.id) : null}
        {state === 'incoming'
          ? pill(s.accept, () => run(person.id, () => acceptFriendRequest(profile.id, person.id)), 'primary', person.id)
          : null}
        {state === 'outgoing' ? <Text style={styles.stateText}>{s.requestSent}</Text> : null}
        {state === 'friends' ? <Text style={styles.stateText}>{s.isFriend}</Text> : null}
        {state === 'blocked'
          ? pill(s.unblock, () => run(person.id, () => unblockUser(profile.id, person.id)), 'muted', person.id)
          : null}
      </View>
    );
  };

  if (showBlocked) {
    return (
      <Screen scroll refreshing={loading} onRefresh={load}>
        {data.blocked.length === 0 && !loading ? <Text style={styles.empty}>{s.noBlocked}</Text> : null}
        {data.blocked.map((person) => (
          <View key={person.id} style={styles.row}>
            {personHead(person)}
            {pill(s.unblock, () => run(person.id, () => unblockUser(profile.id, person.id)), 'muted', person.id)}
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
          placeholder={s.search}
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
          {results.length === 0 ? <Text style={styles.empty}>{s.nothingFound}</Text> : null}
          {results.map(searchRow)}
        </>
      ) : (
        <>
          {data.incoming.length > 0 || data.outgoing.length > 0 ? (
            <>
              <Text style={styles.section}>{s.requests}</Text>
              {data.incoming.map((person) => (
                <View key={person.id} style={styles.requestRow}>
                  <Avatar uri={person.avatar_url} name={person.full_name} size={52} />
                  <View style={styles.requestBody}>
                    <Pressable onPress={() => openProfile(person)}>
                      <Text style={styles.name}>{person.full_name}</Text>
                      <Text style={styles.note}>{s.sentYouRequest}</Text>
                    </Pressable>
                    <View style={styles.requestButtons}>
                      <Pressable
                        disabled={busyId === person.id}
                        onPress={() => run(person.id, () => acceptFriendRequest(profile.id, person.id))}
                        style={[styles.bigButton, styles.pillPrimary, busyId === person.id && styles.busy]}
                      >
                        <Text style={[styles.bigButtonText, styles.pillTextPrimary]}>{s.add}</Text>
                      </Pressable>
                      <Pressable
                        disabled={busyId === person.id}
                        onPress={() => run(person.id, () => removeFriendship(profile.id, person.id))}
                        style={[styles.bigButton, styles.pillMuted, busyId === person.id && styles.busy]}
                      >
                        <Text style={styles.bigButtonText}>{s.decline}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
              {data.outgoing.map((person) => (
                <View key={person.id} style={styles.row}>
                  {personHead(person, s.youSentRequest)}
                  {pill(s.cancelRequest, () => run(person.id, () => removeFriendship(profile.id, person.id)), 'muted', person.id)}
                </View>
              ))}
            </>
          ) : null}

          {suggestions.length > 0 ? (
            <>
              <Text style={styles.section}>{s.suggestions}</Text>
              {suggestions.map(({ profile: person, mutualFriends, sameGroup }) => (
                <View key={person.id} style={styles.row}>
                  {personHead(
                    person,
                    [sameGroup ? s.sameGroup : null, mutualFriends > 0 ? s.mutualFriends(mutualFriends) : null]
                      .filter(Boolean)
                      .join(' · ')
                  )}
                  {pill(s.add, () => add(person), 'primary', person.id)}
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>{s.friends}</Text>
          {data.friends.length === 0 && !loading ? (
            <Text style={styles.emptyLeft}>{s.noFriends}</Text>
          ) : null}
          {data.friends.map((person) => (
            <View key={person.id} style={styles.row}>
              {personHead(person)}
              {pill(s.profile, () => openProfile(person), 'muted', person.id)}
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
