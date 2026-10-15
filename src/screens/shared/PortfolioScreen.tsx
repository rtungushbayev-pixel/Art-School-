import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { fetchUserPosts } from '../../lib/posts';
import { artworkMeta, sortPortfolio } from '../../lib/portfolio';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, shadow, spacing } from '../../theme/colors';
import type { PostCardData } from '../../components/PostCard';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const ALL = '__all__';

const STRINGS = {
  ru: {
    myPortfolio: 'Моё портфолио',
    works: (n: number) => `${n} ${pluralWorks(n)}`,
    all: 'Все',
    untitled: 'Без названия',
    pending: 'На модерации',
    rejected: 'Отклонено',
    empty: 'Пока нет работ',
  },
  kk: {
    myPortfolio: 'Менің портфолиом',
    works: (n: number) => `${n} жұмыс`,
    all: 'Барлығы',
    untitled: 'Атауы жоқ',
    pending: 'Модерацияда',
    rejected: 'Қабылданбады',
    empty: 'Әзірге жұмыстар жоқ',
  },
  en: {
    myPortfolio: 'My portfolio',
    works: (n: number) => (n === 1 ? '1 work' : `${n} works`),
    all: 'All',
    untitled: 'Untitled',
    pending: 'Under review',
    rejected: 'Rejected',
    empty: 'No works yet',
  },
};

export function PortfolioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'Portfolio'>>();
  const { userId } = route.params;
  const { profile: viewer } = useAuth();
  const s = useStrings(STRINGS);
  const isOwner = viewer?.id === userId;

  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [technique, setTechnique] = useState<string>(ALL);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, { data: owner }] = await Promise.all([
        fetchUserPosts(userId, viewer?.id),
        supabase.from('profiles').select('full_name').eq('id', userId).single(),
      ]);
      setPosts(sortPortfolio(rows.filter((p) => p.status === 'approved' || isOwner)));
      setOwnerName(owner?.full_name ?? '');
    } finally {
      setLoading(false);
    }
  }, [userId, viewer?.id, isOwner]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  // Фильтр по технике: варианты собираются из подписанных работ
  const techniques = useMemo(() => {
    const unique = new Map<string, string>();
    posts.forEach((p) => {
      const value = p.technique?.trim();
      if (value && !unique.has(value.toLowerCase())) unique.set(value.toLowerCase(), value);
    });
    return [...unique.values()].sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const visible =
    technique === ALL ? posts : posts.filter((p) => p.technique?.trim().toLowerCase() === technique.toLowerCase());

  return (
    <Screen>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{isOwner ? s.myPortfolio : ownerName}</Text>
            <Text style={styles.subtitle}>
              {s.works(posts.length)}
            </Text>
            {techniques.length > 0 ? (
              <View style={styles.chips}>
                {[ALL, ...techniques].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setTechnique(value)}
                    style={[styles.chip, technique === value && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, technique === value && styles.chipTextActive]}>
                      {value === ALL ? s.all : value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const meta = artworkMeta(item);
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            >
              {item.images[0] ? (
                <Image source={{ uri: item.images[0].image_url }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={styles.image} />
              )}
              {item.featured ? (
                <View style={styles.featured}>
                  <Ionicons name="star" size={12} color={colors.accent} />
                </View>
              ) : null}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title || item.caption || s.untitled}
                </Text>
                {meta ? (
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
                {isOwner && item.status !== 'approved' ? (
                  <Text style={[styles.status, item.status === 'rejected' && styles.statusRejected]}>
                    {item.status === 'pending' ? s.pending : s.rejected}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? null : <Text style={styles.empty}>{s.empty}</Text>
        }
      />
    </Screen>
  );
}

function pluralWorks(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'работа';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'работы';
  return 'работ';
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
  column: { gap: spacing.sm },
  card: {
    flex: 1,
    maxWidth: '49%',
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.soft,
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  featured: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    padding: 3,
  },
  cardBody: { padding: spacing.sm },
  cardTitle: { fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  status: { fontSize: 11, fontWeight: '700', color: colors.warning, marginTop: 4 },
  statusRejected: { color: colors.danger },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
