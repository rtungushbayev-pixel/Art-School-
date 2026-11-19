import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PostCard } from './PostCard';
import { useAuth } from '../hooks/useAuth';
import { fetchReportedPosts, resolvePostReports, type ReportedPost } from '../lib/posts';
import { errorText } from '../lib/errors';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';
import type { StaffStackParamList } from '../navigation/types';

const STRINGS = {
  ru: {
    empty: 'Жалоб нет',
    count: (n: number) => `Жалоб: ${n}`,
    hidden: 'скрыта до решения',
    reasons: {
      inappropriate: 'неприемлемое содержание',
      offensive: 'оскорбление или травля',
      not_own: 'чужая работа',
      spam: 'реклама или спам',
    } as Record<string, string>,
    keep: 'Оставить',
    hide: 'Скрыть',
    failed: 'Не получилось',
  },
  kk: {
    empty: 'Шағым жоқ',
    count: (n: number) => `Шағымдар: ${n}`,
    hidden: 'шешім болғанша жасырылған',
    reasons: {
      inappropriate: 'орынсыз мазмұн',
      offensive: 'қорлау немесе қудалау',
      not_own: 'басқа біреудің жұмысы',
      spam: 'жарнама немесе спам',
    } as Record<string, string>,
    keep: 'Қалдыру',
    hide: 'Жасыру',
    failed: 'Сәтсіз аяқталды',
  },
  en: {
    empty: 'No reports',
    count: (n: number) => `Reports: ${n}`,
    hidden: 'hidden until decided',
    reasons: {
      inappropriate: 'inappropriate content',
      offensive: 'insults or bullying',
      not_own: "someone else's work",
      spam: 'ads or spam',
    } as Record<string, string>,
    keep: 'Keep',
    hide: 'Hide',
    failed: 'Something went wrong',
  },
};

// Вкладка «Жалобы» в «Проверке»: публикации, на которые пожаловались.
export function ReportsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [items, setItems] = useState<ReportedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchReportedPosts(profile?.id));
    } catch {
      // Нет сети — потянуть вниз, чтобы повторить.
    }
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const resolve = async (postId: string, keep: boolean) => {
    if (!profile) return;
    try {
      await resolvePostReports(postId, keep, profile.id);
      setItems((prev) => prev.filter((i) => i.post.id !== postId));
    } catch (e) {
      Alert.alert(s.failed, errorText(e));
    }
  };

  if (!loading && items.length === 0) return <Text style={styles.empty}>{s.empty}</Text>;

  return (
    <View>
      {items.map(({ post, reasons }) => (
        <View key={post.id}>
          <Text style={styles.summary}>
            {s.count(reasons.length)}
            {post.status === 'pending' ? ` · ${s.hidden}` : ''}
            {': '}
            {[...new Set(reasons)].map((r) => s.reasons[r] ?? r).join(', ')}
          </Text>
          <PostCard
            post={post}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            onAuthorPress={() => post.author && navigation.navigate('UserProfile', { userId: post.author.id })}
          />
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.keep]} onPress={() => resolve(post.id, true)}>
              <Text style={styles.buttonText}>{s.keep}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.hide]} onPress={() => resolve(post.id, false)}>
              <Text style={styles.buttonText}>{s.hide}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  summary: { color: colors.danger, fontWeight: '600', marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.lg },
  button: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  keep: { backgroundColor: colors.success },
  hide: { backgroundColor: colors.danger },
  buttonText: { color: colors.white, fontWeight: '700' },
});
