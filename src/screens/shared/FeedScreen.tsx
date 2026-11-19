import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { fetchFriendsData } from '../../lib/friends';
import type { Profile } from '../../types/database';
import { PostCard, PostCardData } from '../../components/PostCard';
import { fetchFeedPosts, fetchUserPosts, toggleLike } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { StoriesRow } from '../../components/StoriesRow';
import { StoryViewer } from '../../components/StoryViewer';
import { fetchStoryGroups, publishStory, type StoryGroup } from '../../lib/stories';
import { askImageSource, pickImage } from '../../lib/pickImage';
import { errorText } from '../../lib/errors';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;
type FeedView = 'all' | 'friends' | 'mine';

const STRINGS = {
  ru: {
    searchPeople: 'Поиск по участникам',
    friends: 'Друзья',
    feed: 'Лента',
    allPosts: 'Все',
    friendsPosts: 'Только друзья',
    myPosts: 'Мои',
    newPost: 'Новая публикация',
    emptyFriends: 'У друзей пока нет публикаций',
    storyTitle: 'Новая сторис',
    storyLive: 'Сторис опубликована на 24 часа.',
    storyRejected: 'Сторис не прошла проверку',
    storyPending: 'Сторис отправлена на проверку. Все увидят её, когда проверка пройдёт.',
    storyFailed: 'Не удалось выложить сторис',
    emptyMine: 'Вы ещё ничего не публиковали',
    emptyAll: 'Пока нет публикаций. Будьте первым!',
  },
  kk: {
    searchPeople: 'Қатысушыларды іздеу',
    friends: 'Достар',
    feed: 'Лента',
    allPosts: 'Барлығы',
    friendsPosts: 'Тек достар',
    myPosts: 'Менікі',
    newPost: 'Жаңа жарияланым',
    emptyFriends: 'Достарыңызда әзірге жарияланым жоқ',
    storyTitle: 'Жаңа оқиға',
    storyLive: 'Оқиға 24 сағатқа жарияланды.',
    storyRejected: 'Оқиға тексеруден өтпеді',
    storyPending: 'Оқиға тексеруге жіберілді. Тексеруден өткен соң оны бәрі көреді.',
    storyFailed: 'Оқиғаны жариялау мүмкін болмады',
    emptyMine: 'Сіз әлі ештеңе жарияламадыңыз',
    emptyAll: 'Әзірге жарияланымдар жоқ. Бірінші болыңыз!',
  },
  en: {
    searchPeople: 'Search members',
    friends: 'Friends',
    feed: 'Feed',
    allPosts: 'All',
    friendsPosts: 'Friends only',
    myPosts: 'Mine',
    newPost: 'New post',
    emptyFriends: 'Your friends have not posted yet',
    storyTitle: 'New story',
    storyLive: 'Your story is live for 24 hours.',
    storyRejected: 'Your story did not pass review',
    storyPending: 'Your story is under review. Everyone will see it once it passes.',
    storyFailed: 'Could not post the story',
    emptyMine: 'You have not posted anything yet',
    emptyAll: 'No posts yet. Be the first!',
  },
};

export function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<FeedView>('all');
  // Родитель смотрит Комьюнити, но сам не публикует.
  const canPost = !!profile && profile.role !== 'parent';
  // Друзья — у учеников и сотрудников.
  const hasFriends = canPost;
  const [friends, setFriends] = useState<Profile[]>([]);
  // Нажатие на значок «Комьюнити» — лента к началу, к самой свежей публикации.
  const [scrollTop, setScrollTop] = useState(0);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [openStory, setOpenStory] = useState<number | null>(null);
  const [storyUploading, setStoryUploading] = useState(false);

  const loadStories = useCallback(() => {
    if (!profile) return;
    fetchStoryGroups(profile.id)
      .then(setStoryGroups)
      .catch(() => {});
  }, [profile]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // «Мои публикации» — все свои, включая ещё не прошедшие проверку.
      const data =
        view === 'mine' && profile ? await fetchUserPosts(profile.id, profile.id) : await fetchFeedPosts(profile?.id);
      setPosts(data);
      if (hasFriends && profile) {
        fetchFriendsData(profile.id)
          .then((d) => setFriends(d.friends))
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }, [profile, view, hasFriends]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadStories();
    }, [load, loadStories])
  );

  const addStory = async () => {
    if (!profile || storyUploading) return;
    const source = await askImageSource(s.storyTitle);
    if (!source) return;
    const asset = await pickImage(source, false);
    if (!asset) return;
    setStoryUploading(true);
    try {
      const decision = await publishStory(profile.id, asset);
      if (decision === 'approve') Alert.alert(s.storyLive);
      else if (decision === 'reject' || decision === 'review') Alert.alert(s.storyRejected);
      else Alert.alert(s.storyPending);
    } catch (e) {
      Alert.alert(s.storyFailed, errorText(e));
    }
    setStoryUploading(false);
    loadStories();
  };

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', () => {
      setView('all');
      setScrollTop((n) => n + 1);
    });
    return unsubscribe;
  }, [navigation]);

  const onToggleLike = async (post: PostCardData) => {
    if (!profile) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
    await toggleLike(post.id, profile.id, post.likedByMe);
  };

  // «Только друзья» — те же одобренные публикации, но от друзей.
  const friendIds = new Set(friends.map((f) => f.id));
  const visible = view === 'friends' ? posts.filter((p) => p.author && friendIds.has(p.author.id)) : posts;
  // «Сторис только от друзей» в настройках: свои и друзей.
  const visibleStoryGroups =
    profile?.stories_friends_only
      ? storyGroups.filter((g) => g.author.id === profile.id || friendIds.has(g.author.id))
      : storyGroups;
  const tabs: [FeedView, string][] = [
    ['all', s.allPosts],
    ...(hasFriends ? ([['friends', s.friendsPosts]] as [FeedView, string][]) : []),
    ...(canPost ? ([['mine', s.myPosts]] as [FeedView, string][]) : []),
  ];

  return (
    <View style={styles.root}>
      <Screen
        scroll
        refreshing={loading}
        onRefresh={() => {
          load();
          loadStories();
        }}
        scrollToTopSignal={scrollTop}
      >
        {canPost && profile ? (
          <Pressable style={styles.search} onPress={() => navigation.navigate('Friends', { focusSearch: true })}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.searchText}>{s.searchPeople}</Text>
          </Pressable>
        ) : null}

        {profile ? (
          <StoriesRow
            viewer={profile}
            groups={visibleStoryGroups}
            canPost={canPost}
            uploading={storyUploading}
            onAdd={addStory}
            onOpen={setOpenStory}
          />
        ) : null}

        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>{s.feed}</Text>
          {hasFriends ? (
            <Pressable style={styles.friends} onPress={() => navigation.navigate('Friends')}>
              <Text style={styles.friendsLabel}>{s.friends}</Text>
              <View style={styles.avatars}>
                {friends.slice(0, 2).map((f, i) => (
                  <View key={f.id} style={[styles.stackAvatar, i > 0 && styles.stackOverlap]}>
                    <Avatar uri={f.avatar_url} name={f.full_name} size={30} />
                  </View>
                ))}
                {friends.length > 2 ? (
                  <View style={[styles.more, styles.stackOverlap]}>
                    <Text style={styles.moreText}>+{friends.length - 2}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </View>

        {tabs.length > 1 ? (
          <View style={styles.chips}>
            {tabs.map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setView(value)}
                style={[styles.chip, view === value && styles.chipActive]}
              >
                <Text style={[styles.chipText, view === value && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {visible.length === 0 && !loading ? (
          <Text style={styles.empty}>
            {view === 'mine' ? s.emptyMine : view === 'friends' ? s.emptyFriends : s.emptyAll}
          </Text>
        ) : null}

        {visible.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            onAuthorPress={() => post.author && navigation.navigate('UserProfile', { userId: post.author.id })}
            onToggleLike={() => onToggleLike(post)}
            showModerationBadge={view === 'mine'}
            viewer={profile}
          />
        ))}
        {/* Место под кнопкой «+», чтобы она не закрывала последнюю публикацию. */}
        {canPost ? <View style={{ height: 72 }} /> : null}
      </Screen>

      {profile ? (
        <StoryViewer
          groups={visibleStoryGroups}
          startIndex={openStory}
          viewerId={profile.id}
          onClose={() => {
            setOpenStory(null);
            loadStories();
          }}
          onDeleted={loadStories}
        />
      ) : null}

      {canPost ? (
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate('NewCommunityPost')}
          accessibilityLabel={s.newPost}
        >
          <Ionicons name="add" size={32} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  feedTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
  },
  chipActive: { backgroundColor: colors.surface, borderColor: colors.border },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.text },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  searchText: { color: colors.textMuted, fontSize: 15 },
  friends: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  friendsLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: { borderRadius: 17, borderWidth: 2, borderColor: colors.background },
  stackOverlap: { marginLeft: -10 },
  more: {
    height: 34,
    minWidth: 34,
    paddingHorizontal: 6,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.background,
  },
  moreText: { fontSize: 13, fontWeight: '700', color: colors.text },
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
