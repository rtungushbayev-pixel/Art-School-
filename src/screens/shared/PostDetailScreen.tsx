import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { toggleLike } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';
import type { Post, PostImage, Profile } from '../../types/database';

type NavParamList = StudentStackParamList & StaffStackParamList;

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

export function PostDetailScreen() {
  const route = useRoute<RouteProp<NavParamList, 'PostDetail'>>();
  const { postId } = route.params;
  const { profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();

  const [post, setPost] = useState<Post | null>(null);
  const [images, setImages] = useState<PostImage[]>([]);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data: postData } = await supabase.from('posts').select('*').eq('id', postId).single();
    if (!postData) return;
    setPost(postData as Post);

    const [{ data: imgs }, { data: authorData }, { data: commentRows }, { data: likeRows }] = await Promise.all([
      supabase.from('post_images').select('*').eq('post_id', postId).order('position'),
      supabase.from('profiles').select('*').eq('id', (postData as Post).author_id).single(),
      supabase
        .from('post_comments')
        .select('id, content, created_at, profiles:author_id ( id, full_name, avatar_url )')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      supabase.from('post_likes').select('user_id').eq('post_id', postId),
    ]);

    setImages((imgs as PostImage[]) ?? []);
    setAuthor(authorData as Profile);
    setComments(
      ((commentRows as any[]) ?? []).map((c) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author: c.profiles,
      }))
    );
    const likes = likeRows ?? [];
    setLikeCount(likes.length);
    setLikedByMe(!!profile && likes.some((l) => l.user_id === profile.id));
  }, [postId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onToggleLike = async () => {
    if (!profile) return;
    setLikedByMe((prev) => !prev);
    setLikeCount((prev) => prev + (likedByMe ? -1 : 1));
    await toggleLike(postId, profile.id, likedByMe);
  };

  const onAddComment = async () => {
    if (!profile || !commentText.trim()) return;
    setPosting(true);
    const { error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id: profile.id, content: commentText.trim() });
    setPosting(false);
    if (error) {
      Alert.alert('Не удалось отправить комментарий', error.message);
      return;
    }
    setCommentText('');
    load();
  };

  const canDelete = profile && (profile.role === 'staff' || profile.id === post?.author_id);

  const onDelete = () => {
    Alert.alert('Удалить публикацию?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('posts').delete().eq('id', postId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!post) {
    return (
      <Screen>
        <Text style={styles.empty}>Загрузка…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Avatar uri={author?.avatar_url} name={author?.full_name} />
              <Text style={styles.authorName}>{author?.full_name}</Text>
            </View>
            {images[0] ? (
              <Image source={{ uri: images[0].image_url }} style={styles.image} contentFit="cover" />
            ) : null}
            {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
            <View style={styles.actionsRow}>
              <Text onPress={onToggleLike} style={[styles.like, likedByMe && styles.liked]}>
                {likedByMe ? '♥' : '♡'} {likeCount}
              </Text>
              {canDelete ? (
                <Text onPress={onDelete} style={styles.delete}>
                  Удалить
                </Text>
              ) : null}
            </View>
            <Text style={styles.commentsTitle}>Комментарии</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Avatar uri={item.author?.avatar_url} name={item.author?.full_name} size={28} />
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{item.author?.full_name}</Text>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Комментариев пока нет</Text>}
        ListFooterComponent={
          <View style={styles.commentForm}>
            <TextField
              placeholder="Написать комментарий…"
              value={commentText}
              onChangeText={setCommentText}
            />
            <Button title="Отправить" onPress={onAddComment} loading={posting} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  authorName: { fontWeight: '700', color: colors.text },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
  caption: { marginTop: spacing.sm, color: colors.text },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.sm },
  like: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  liked: { color: colors.primary },
  delete: { color: colors.danger, fontWeight: '600' },
  commentsTitle: { fontWeight: '700', color: colors.primary, marginTop: spacing.sm, marginBottom: spacing.xs },
  comment: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: '700', color: colors.text, fontSize: 13 },
  commentText: { color: colors.text },
  commentForm: { marginTop: spacing.md, marginBottom: spacing.xl },
});
