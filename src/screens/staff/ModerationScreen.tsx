import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PostCard, PostCardData } from '../../components/PostCard';
import { ListingCard } from '../../components/ListingCard';
import { fetchPendingPosts } from '../../lib/posts';
import { fetchPendingListings, ListingCardData } from '../../lib/marketplace';
import { supabase } from '../../lib/supabase';
import { sendPushNotification } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

type ModerationScope = 'posts' | 'listings';

export function ModerationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const { profile } = useAuth();
  const [scope, setScope] = useState<ModerationScope>('posts');
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (scope === 'posts') {
        setPosts(await fetchPendingPosts(profile?.id));
      } else {
        setListings(await fetchPendingListings());
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.id, scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const moderatePost = async (post: PostCardData, status: 'approved' | 'rejected') => {
    if (!profile) return;
    await supabase
      .from('posts')
      .update({ status, moderated_by: profile.id, moderated_at: new Date().toISOString() })
      .eq('id', post.id);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    if (post.author) {
      sendPushNotification({
        userIds: [post.author.id],
        title: status === 'approved' ? 'Работа одобрена' : 'Работа отклонена',
        body: status === 'approved' ? 'Ваша публикация появилась в общей ленте' : 'Публикацию не пропустили модераторы',
        data: { type: 'post_moderated', postId: post.id },
      });
    }
  };

  const moderateListing = async (listing: ListingCardData, status: 'approved' | 'rejected') => {
    if (!profile) return;
    await supabase
      .from('marketplace_listings')
      .update({ status, moderated_by: profile.id, moderated_at: new Date().toISOString() })
      .eq('id', listing.id);
    setListings((prev) => prev.filter((l) => l.id !== listing.id));
    if (listing.seller) {
      sendPushNotification({
        userIds: [listing.seller.id],
        title: status === 'approved' ? 'Объявление одобрено' : 'Объявление отклонено',
        body:
          status === 'approved'
            ? `«${listing.title}» опубликовано в разделе «Продажа»`
            : `«${listing.title}» не прошло проверку`,
        data: { type: 'listing_moderated', listingId: listing.id },
      });
    }
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>Модерация</Text>

      <View style={styles.scopeRow}>
        <Pressable
          onPress={() => setScope('posts')}
          style={[styles.scopeOption, scope === 'posts' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'posts' && styles.scopeTextActive]}>Работы в ленте</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('listings')}
          style={[styles.scopeOption, scope === 'listings' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'listings' && styles.scopeTextActive]}>Товары на продажу</Text>
        </Pressable>
      </View>

      {scope === 'posts' ? (
        <>
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
                <Pressable
                  style={[styles.actionButton, styles.approve]}
                  onPress={() => moderatePost(post, 'approved')}
                >
                  <Text style={styles.actionText}>Одобрить</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.reject]}
                  onPress={() => moderatePost(post, 'rejected')}
                >
                  <Text style={styles.actionText}>Отклонить</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : (
        <>
          {listings.length === 0 && !loading ? (
            <Text style={styles.empty}>Новых объявлений на проверку нет</Text>
          ) : null}
          {listings.map((listing) => (
            <View key={listing.id}>
              <ListingCard
                listing={listing}
                showModerationBadge
                onPress={() => navigation.navigate('ListingDetail', { listingId: listing.id })}
              />
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, styles.approve]}
                  onPress={() => moderateListing(listing, 'approved')}
                >
                  <Text style={styles.actionText}>Одобрить</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.reject]}
                  onPress={() => moderateListing(listing, 'rejected')}
                >
                  <Text style={styles.actionText}>Отклонить</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  scopeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  scopeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  scopeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scopeText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  scopeTextActive: { color: colors.white },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.md },
  actionButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  approve: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  actionText: { color: colors.white, fontWeight: '700' },
});
