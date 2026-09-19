import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from './Avatar';
import { colors, radius, spacing } from '../theme/colors';

export interface PostCardData {
  id: string;
  caption: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  author: { id: string; full_name: string; avatar_url: string | null } | null;
  images: { id: string; image_url: string }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

interface PostCardProps {
  post: PostCardData;
  onPress?: () => void;
  onToggleLike?: () => void;
  onAuthorPress?: () => void;
  showModerationBadge?: boolean;
}

export function PostCard({ post, onPress, onToggleLike, onAuthorPress, showModerationBadge }: PostCardProps) {
  const cover = post.images[0];
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Pressable onPress={onAuthorPress} style={styles.header}>
        <Avatar uri={post.author?.avatar_url} name={post.author?.full_name} size={36} />
        <Text style={styles.authorName}>{post.author?.full_name ?? 'Ученик'}</Text>
        {showModerationBadge && post.status !== 'approved' ? (
          <View style={[styles.badge, post.status === 'pending' ? styles.badgePending : styles.badgeRejected]}>
            <Text style={styles.badgeText}>{post.status === 'pending' ? 'На модерации' : 'Отклонено'}</Text>
          </View>
        ) : null}
      </Pressable>

      {cover ? (
        <Image source={{ uri: cover.image_url }} style={styles.image} contentFit="cover" />
      ) : null}

      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      <View style={styles.footer}>
        <Pressable onPress={onToggleLike} style={styles.footerItem}>
          <Text style={[styles.footerText, post.likedByMe && styles.liked]}>
            {post.likedByMe ? '♥' : '♡'} {post.likeCount}
          </Text>
        </Pressable>
        <View style={styles.footerItem}>
          <Text style={styles.footerText}>💬 {post.commentCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm },
  authorName: { fontWeight: '700', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  badgePending: { backgroundColor: colors.accent },
  badgeRejected: { backgroundColor: colors.danger },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  caption: { padding: spacing.sm, color: colors.text },
  footer: { flexDirection: 'row', padding: spacing.sm, gap: spacing.lg },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: colors.textMuted, fontWeight: '600' },
  liked: { color: colors.primary },
});
