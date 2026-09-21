import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PostCard, PostCardData } from '../../components/PostCard';
import { fetchFeedPosts, toggleLike } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFeedPosts(profile?.id);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

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
      <Text style={styles.header}>Лента достижений</Text>
      <Pressable style={styles.createButton} onPress={() => navigation.navigate('CreatePost')}>
        <Text style={styles.createButtonText}>+ Поделиться работой</Text>
      </Pressable>

      {posts.length === 0 && !loading ? (
        <Text style={styles.empty}>Пока нет публикаций. Будьте первым!</Text>
      ) : null}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          onAuthorPress={() => post.author && navigation.navigate('UserProfile', { userId: post.author.id })}
          onToggleLike={() => onToggleLike(post)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createButtonText: { color: colors.white, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
