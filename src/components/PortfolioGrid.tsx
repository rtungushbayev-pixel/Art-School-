import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/colors';
import type { PostCardData } from './PostCard';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: { pending: 'На модерации', rejected: 'Отклонено' },
  kk: { pending: 'Тексеруде', rejected: 'Қабылданбады' },
  en: { pending: 'Under review', rejected: 'Rejected' },
};

interface PortfolioGridProps {
  posts: PostCardData[];
  onPressPost: (postId: string) => void;
  // Показывать статус модерации — только автору на его собственных работах
  showStatus?: boolean;
}

export function PortfolioGrid({ posts, onPressPost, showStatus }: PortfolioGridProps) {
  const s = useStrings(STRINGS);
  return (
    <View style={styles.grid}>
      {posts.map((post) => (
        <Pressable key={post.id} style={styles.gridItem} onPress={() => onPressPost(post.id)}>
          {post.images[0] ? (
            <Image source={{ uri: post.images[0].image_url }} style={styles.gridImage} contentFit="cover" />
          ) : (
            <View style={styles.gridImage} />
          )}
          {post.featured ? (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color={colors.accent} />
            </View>
          ) : null}
          {showStatus && post.status !== 'approved' ? (
            <View style={styles.statusOverlay}>
              <Text style={styles.statusText}>{post.status === 'pending' ? s.pending : s.rejected}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: { width: '32%', aspectRatio: 1, position: 'relative' },
  gridImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.border },
  featuredBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    padding: 3,
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingVertical: 2,
  },
  statusText: { color: colors.white, fontSize: 9, fontWeight: '700', textAlign: 'center' },
});
