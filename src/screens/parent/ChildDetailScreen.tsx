import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { AttendanceSummary } from '../../components/AttendanceSummary';
import { ProgressNoteCard } from '../../components/ProgressNoteCard';
import { supabase } from '../../lib/supabase';
import { fetchUserPosts } from '../../lib/posts';
import {
  fetchProgressNotes,
  fetchStudentAttendance,
  fetchStudentGroupNames,
  type ProgressNoteWithAuthor,
} from '../../lib/parents';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { Attendance, Profile } from '../../types/database';
import type { PostCardData } from '../../components/PostCard';
import type { ParentStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ParentStackParamList, 'ChildDetail'>;
type Tab = 'progress' | 'gallery';

const ATTENDANCE_DAYS = 30;

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function ChildDetailScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const { profile: viewer } = useAuth();
  const [tab, setTab] = useState<Tab>('progress');
  const [child, setChild] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notes, setNotes] = useState<ProgressNoteWithAuthor[]>([]);
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', childId).single();
      setChild(data as Profile);
      const [groupNames, attendanceRows, progress, works] = await Promise.all([
        fetchStudentGroupNames(childId),
        fetchStudentAttendance(childId, daysAgoISO(ATTENDANCE_DAYS)),
        fetchProgressNotes(childId),
        fetchUserPosts(childId, viewer?.id),
      ]);
      setGroups(groupNames);
      setAttendance(attendanceRows);
      setNotes(progress);
      setPosts(works);
    } finally {
      setLoading(false);
    }
  }, [childId, viewer?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {child ? (
        <View style={styles.hero}>
          <Avatar uri={child.avatar_url} name={child.full_name} size={72} />
          <Text style={styles.name}>{child.full_name || 'Без имени'}</Text>
          {groups.length > 0 ? <Text style={styles.groups}>{groups.join(', ')}</Text> : null}
        </View>
      ) : null}

      <View style={styles.segment}>
        {(
          [
            ['progress', 'Прогресс'],
            ['gallery', `Галерея (${posts.length})`],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            style={[styles.segmentItem, tab === value && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, tab === value && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'progress' ? (
        <>
          <AttendanceSummary rows={attendance} periodLabel={`за ${ATTENDANCE_DAYS} дней`} />
          <Text style={styles.sectionTitle}>Отзывы преподавателей</Text>
          {notes.length === 0 && !loading ? (
            <Text style={styles.empty}>Преподаватели ещё не оставляли отзывов</Text>
          ) : null}
          {notes.map((note) => (
            <ProgressNoteCard key={note.id} note={note} />
          ))}
        </>
      ) : (
        <>
          {posts.length === 0 && !loading ? <Text style={styles.empty}>Работ пока нет</Text> : null}
          <View style={styles.grid}>
            {posts.map((post) => (
              <Pressable
                key={post.id}
                style={styles.gridItem}
                onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
              >
                {post.images[0] ? (
                  <Image source={{ uri: post.images[0].image_url }} style={styles.gridImage} contentFit="cover" />
                ) : (
                  <View style={styles.gridImage} />
                )}
                {post.status !== 'approved' ? (
                  <View style={styles.statusOverlay}>
                    <Text style={styles.statusText}>
                      {post.status === 'pending' ? 'На модерации' : 'Отклонено'}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.gridDate}>
                  {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.md },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  groups: { color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.full, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { fontWeight: '600', color: colors.text },
  segmentTextActive: { color: colors.white },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  gridItem: { width: '48.5%' },
  gridImage: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
  gridDate: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  statusOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  statusText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
