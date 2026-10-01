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
import { artworkMeta } from '../../lib/portfolio';
import { sendPushNotification } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
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

const STRINGS = {
  ru: {
    commentFailed: 'Не удалось отправить комментарий',
    deleteConfirm: 'Удалить публикацию?',
    cancel: 'Отмена',
    delete: 'Удалить',
    notFound: 'Публикация удалена или недоступна',
    loading: 'Загрузка…',
    edit: 'Изменить',
    comments: 'Комментарии',
    noComments: 'Комментариев пока нет',
    commentPlaceholder: 'Написать комментарий…',
    send: 'Отправить',
  },
  kk: {
    commentFailed: 'Пікірді жіберу мүмкін болмады',
    deleteConfirm: 'Жарияланымды жою керек пе?',
    cancel: 'Бас тарту',
    delete: 'Жою',
    notFound: 'Жарияланым жойылған немесе қолжетімсіз',
    loading: 'Жүктелуде…',
    edit: 'Өзгерту',
    comments: 'Пікірлер',
    noComments: 'Әзірге пікірлер жоқ',
    commentPlaceholder: 'Пікір жазу…',
    send: 'Жіберу',
  },
  en: {
    commentFailed: 'Could not send the comment',
    deleteConfirm: 'Delete this post?',
    cancel: 'Cancel',
    delete: 'Delete',
    notFound: 'This post has been deleted or is unavailable',
    loading: 'Loading…',
    edit: 'Edit',
    comments: 'Comments',
    noComments: 'No comments yet',
    commentPlaceholder: 'Write a comment…',
    send: 'Send',
  },
};

export function PostDetailScreen() {
  const route = useRoute<RouteProp<NavParamList, 'PostDetail'>>();
  const { postId } = route.params;
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();

  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [images, setImages] = useState<PostImage[]>([]);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data: postData, error } = await supabase.from('posts').select('*').eq('id', postId).maybeSingle();
    // Нет ошибки и нет строки — публикация удалена или недоступна (например,
    // открыта из старого уведомления). При ошибке сети оставляем «Загрузка…».
    if (!error && !postData) setNotFound(true);
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
    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id: profile.id, content: commentText.trim() })
      .select('id')
      .single();
    setPosting(false);
    if (error) {
      Alert.alert(s.commentFailed, error.message);
      return;
    }
    setCommentText('');
    load();

    sendPushNotification({ event: 'post_comment', id: comment.id });
  };

  const canDelete = profile && (profile.role === 'staff' || profile.id === post?.author_id);
  const isAuthor = !!profile && profile.id === post?.author_id;

  const onDelete = () => {
    Alert.alert(s.deleteConfirm, undefined, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
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
        <Text style={styles.empty}>{notFound ? s.notFound : s.loading}</Text>
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
            {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
            {artworkMeta(post) ? <Text style={styles.meta}>{artworkMeta(post)}</Text> : null}
            {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
            <View style={styles.actionsRow}>
              <Text onPress={onToggleLike} style={[styles.like, likedByMe && styles.liked]}>
                {likedByMe ? '♥' : '♡'} {likeCount}
              </Text>
              <View style={styles.ownerActions}>
                {isAuthor ? (
                  <Text onPress={() => navigation.navigate('EditArtwork', { postId })} style={styles.edit}>
                    {post.featured ? '★ ' : ''}
                    {s.edit}
                  </Text>
                ) : null}
                {canDelete ? (
                  <Text onPress={onDelete} style={styles.delete}>
                    {s.delete}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.commentsTitle}>{s.comments}</Text>
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
        ListEmptyComponent={<Text style={styles.empty}>{s.noComments}</Text>}
        ListFooterComponent={
          <View style={styles.commentForm}>
            <TextField
              placeholder={s.commentPlaceholder}
              value={commentText}
              onChangeText={setCommentText}
            />
            <Button title={s.send} onPress={onAddComment} loading={posting} />
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
  title: { marginTop: spacing.sm, fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  caption: { marginTop: spacing.sm, color: colors.text },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.sm },
  like: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  liked: { color: colors.primary },
  ownerActions: { flexDirection: 'row', gap: spacing.md },
  edit: { color: colors.primary, fontWeight: '600' },
  delete: { color: colors.danger, fontWeight: '600' },
  commentsTitle: { fontWeight: '700', color: colors.primary, marginTop: spacing.sm, marginBottom: spacing.xs },
  comment: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: '700', color: colors.text, fontSize: 13 },
  commentText: { color: colors.text },
  commentForm: { marginTop: spacing.md, marginBottom: spacing.xl },
});
