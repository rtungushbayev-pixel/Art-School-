import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PostCard, PostCardData } from '../../components/PostCard';
import { ListingCard } from '../../components/ListingCard';
import { fetchPendingPosts } from '../../lib/posts';
import { fetchPendingListings, ListingCardData } from '../../lib/marketplace';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../components/Avatar';
import {
  approveChildLinkRequest,
  cancelChildLinkRequest,
  fetchParentLinkRequests,
  type ParentLinkRequest,
} from '../../lib/parents';
import { sendPushNotification } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    failed: 'Не получилось',
    works: 'Работы',
    market: 'Продажа',
    parents: 'Родители',
    noPosts: 'Новых работ на проверку нет',
    approve: 'Одобрить',
    reject: 'Отклонить',
    noRequests: 'Новых заявок от родителей нет',
    parent: 'Родитель',
    asksToLink: ' просит привязать ребёнка:',
    student: 'Ученик',
    linkHint: 'Подтвердите, только если уверены, что это родитель этого ребёнка.',
    confirm: 'Подтвердить',
    noListings: 'Новых объявлений на проверку нет',
  },
  kk: {
    failed: 'Сәтсіз аяқталды',
    works: 'Жұмыстар',
    market: 'Сату',
    parents: 'Ата-аналар',
    noPosts: 'Тексеруге жаңа жұмыстар жоқ',
    approve: 'Мақұлдау',
    reject: 'Қабылдамау',
    noRequests: 'Ата-аналардан жаңа өтінімдер жоқ',
    parent: 'Ата-ана',
    asksToLink: ' баланы байланыстыруды сұрайды:',
    student: 'Оқушы',
    linkHint: 'Бұл осы баланың ата-анасы екеніне сенімді болсаңыз ғана растаңыз.',
    confirm: 'Растау',
    noListings: 'Тексеруге жаңа хабарландырулар жоқ',
  },
  en: {
    failed: 'Something went wrong',
    works: 'Artworks',
    market: 'For sale',
    parents: 'Parents',
    noPosts: 'No new artworks to review',
    approve: 'Approve',
    reject: 'Reject',
    noRequests: 'No new requests from parents',
    parent: 'Parent',
    asksToLink: ' asks to link a child:',
    student: 'Student',
    linkHint: 'Confirm only if you are sure this is the child’s parent.',
    confirm: 'Confirm',
    noListings: 'No new listings to review',
  },
};

type ModerationScope = 'posts' | 'listings' | 'parents';

export function ModerationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const s = useStrings(STRINGS);
  const { profile } = useAuth();
  const [scope, setScope] = useState<ModerationScope>('posts');
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [linkRequests, setLinkRequests] = useState<ParentLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (scope === 'posts') {
        setPosts(await fetchPendingPosts(profile?.id));
      } else if (scope === 'listings') {
        setListings(await fetchPendingListings());
      } else {
        setLinkRequests(await fetchParentLinkRequests());
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
    sendPushNotification({ event: 'post_moderated', id: post.id });
  };

  const moderateListing = async (listing: ListingCardData, status: 'approved' | 'rejected') => {
    if (!profile) return;
    await supabase
      .from('marketplace_listings')
      .update({ status, moderated_by: profile.id, moderated_at: new Date().toISOString() })
      .eq('id', listing.id);
    setListings((prev) => prev.filter((l) => l.id !== listing.id));
    sendPushNotification({ event: 'listing_moderated', id: listing.id });
  };

  const resolveLinkRequest = async (request: ParentLinkRequest, approve: boolean) => {
    try {
      if (approve) await approveChildLinkRequest(request.id);
      else await cancelChildLinkRequest(request.id);
      setLinkRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (e) {
      Alert.alert(s.failed, e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>

      <View style={styles.scopeRow}>
        <Pressable
          onPress={() => setScope('posts')}
          style={[styles.scopeOption, scope === 'posts' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'posts' && styles.scopeTextActive]}>{s.works}</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('listings')}
          style={[styles.scopeOption, scope === 'listings' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'listings' && styles.scopeTextActive]}>{s.market}</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('parents')}
          style={[styles.scopeOption, scope === 'parents' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'parents' && styles.scopeTextActive]}>{s.parents}</Text>
        </Pressable>
      </View>

      {scope === 'posts' ? (
        <>
          {posts.length === 0 && !loading ? (
            <Text style={styles.empty}>{s.noPosts}</Text>
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
                  <Text style={styles.actionText}>{s.approve}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.reject]}
                  onPress={() => moderatePost(post, 'rejected')}
                >
                  <Text style={styles.actionText}>{s.reject}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : scope === 'parents' ? (
        <>
          {linkRequests.length === 0 && !loading ? (
            <Text style={styles.empty}>{s.noRequests}</Text>
          ) : null}
          {linkRequests.map((request) => (
            <View key={request.id} style={styles.linkCard}>
              <Text style={styles.linkText}>
                <Text style={styles.linkName}>{request.parent?.full_name ?? s.parent}</Text>{s.asksToLink}
              </Text>
              <Pressable
                style={styles.linkChild}
                onPress={() => request.student && navigation.navigate('UserProfile', { userId: request.student.id })}
              >
                <Avatar uri={request.student?.avatar_url} name={request.student?.full_name} size={40} />
                <Text style={styles.linkName}>{request.student?.full_name ?? s.student}</Text>
              </Pressable>
              <Text style={styles.linkHint}>{s.linkHint}</Text>
              <View style={styles.linkActions}>
                <Pressable
                  style={[styles.actionButton, styles.approve]}
                  onPress={() => resolveLinkRequest(request, true)}
                >
                  <Text style={styles.actionText}>{s.confirm}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.reject]}
                  onPress={() => resolveLinkRequest(request, false)}
                >
                  <Text style={styles.actionText}>{s.reject}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : (
        <>
          {listings.length === 0 && !loading ? (
            <Text style={styles.empty}>{s.noListings}</Text>
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
                  <Text style={styles.actionText}>{s.approve}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.reject]}
                  onPress={() => moderateListing(listing, 'rejected')}
                >
                  <Text style={styles.actionText}>{s.reject}</Text>
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
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  linkText: { color: colors.text },
  linkName: { fontWeight: '700', color: colors.text },
  linkChild: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkHint: { color: colors.textMuted, fontSize: 12 },
  linkActions: { flexDirection: 'row', gap: spacing.sm },
});
