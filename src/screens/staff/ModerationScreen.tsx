import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PostCard, PostCardData } from '../../components/PostCard';
import { fetchPendingPosts } from '../../lib/posts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

export function ModerationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await fetchPendingPosts(profile?.id));
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const moderate = async (postId: string, status: 'approved' | 'rejected') => {
    if (!profile) return;
    await supabase
      .from('posts')
      .update({ status, moderated_by: profile.id, moderated_at: new Date().toISOString() })
      .eq('id', postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>Модерация работ</Text>
      {posts.length === 0 && !loading ? (
        <Text style={styles.empty}>Новых работ на проверку нет</Text>
      ) : null}
      {posts.map((post) => (
        <View key={post.id}>
          <PostCard
            post={post}
            showModerationBadge
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            onAuthorPress={() => post.author && navigation.navigate('UserProfile', { userId: post.author.id })}
          />
          <View style={styles.actions}>
            <Pressable style={[styles.actionButton, styles.approve]} onPress={() => moderate(post.id, 'approved')}>
              <Text style={styles.actionText}>Одобрить</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.reject]} onPress={() => moderate(post.id, 'rejected')}>
              <Text style={styles.actionText}>Отклонить</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.md },
  actionButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  approve: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  actionText: { color: colors.white, fontWeight: '700' },
});
