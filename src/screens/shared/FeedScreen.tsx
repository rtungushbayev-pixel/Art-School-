import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CommunityComposer } from '../../components/CommunityComposer';
import { Avatar } from '../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { fetchFriendsData } from '../../lib/friends';
import type { Profile } from '../../types/database';
import { PostCard, PostCardData } from '../../components/PostCard';
import { fetchFeedPosts, fetchUserPosts, toggleLike } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;
type FeedView = 'all' | 'mine';

const STRINGS = {
  ru: {
    searchPeople: 'Поиск по участникам',
    friends: 'Друзья',
    allPosts: 'Все публикации',
    myPosts: 'Мои публикации',
    emptyMine: 'Вы ещё ничего не публиковали',
    emptyAll: 'Пока нет публикаций. Будьте первым!',
  },
  kk: {
    searchPeople: 'Қатысушыларды іздеу',
    friends: 'Достар',
    allPosts: 'Барлық жарияланымдар',
    myPosts: 'Менің жарияланымдарым',
    emptyMine: 'Сіз әлі ештеңе жарияламадыңыз',
    emptyAll: 'Әзірге жарияланымдар жоқ. Бірінші болыңыз!',
  },
  en: {
    searchPeople: 'Search members',
    friends: 'Friends',
    allPosts: 'All posts',
    myPosts: 'My posts',
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
    }, [load])
  );

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

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {canPost && profile ? (
        <>
          <View style={styles.topRow}>
            <Pressable style={styles.search} onPress={() => navigation.navigate('Friends', { focusSearch: true })}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <Text style={styles.searchText}>{s.searchPeople}</Text>
            </Pressable>
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
          </View>
          <CommunityComposer authorId={profile.id} onPublished={load} />
          <View style={styles.segment}>
            {(
              [
                ['all', s.allPosts],
                ['mine', s.myPosts],
              ] as [FeedView, string][]
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setView(value)}
                style={[styles.segmentItem, view === value && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, view === value && styles.segmentTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {posts.length === 0 && !loading ? (
        <Text style={styles.empty}>
          {view === 'mine' ? s.emptyMine : s.emptyAll}
        </Text>
      ) : null}

      {posts.map((post) => (
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
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
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md - 2, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
