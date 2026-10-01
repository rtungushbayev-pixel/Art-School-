import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CommunityComposer } from '../../components/CommunityComposer';
import { PostCard, PostCardData } from '../../components/PostCard';
import { fetchFeedPosts, fetchUserPosts, toggleLike } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;
type FeedView = 'all' | 'mine';

export function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<FeedView>('all');
  // Родитель смотрит Комьюнити, но сам не публикует.
  const canPost = !!profile && profile.role !== 'parent';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // «Мои публикации» — все свои, включая ещё не прошедшие проверку.
      const data =
        view === 'mine' && profile ? await fetchUserPosts(profile.id, profile.id) : await fetchFeedPosts(profile?.id);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, view]);

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
          <CommunityComposer authorId={profile.id} onPublished={load} />
          <View style={styles.segment}>
            {(
              [
                ['all', 'Все публикации'],
                ['mine', 'Мои публикации'],
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
          {view === 'mine' ? 'Вы ещё ничего не публиковали' : 'Пока нет публикаций. Будьте первым!'}
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
        />
      ))}
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
  segmentText: { color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
