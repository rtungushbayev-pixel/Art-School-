import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { FEATURES } from '../../lib/features';
import { fetchChildTeachers, startChat, type ChildTeacher } from '../../lib/chats';
import { errorText } from '../../lib/errors';
import { ProgressNoteCard } from '../../components/ProgressNoteCard';
import { supabase } from '../../lib/supabase';
import { fetchUserPosts } from '../../lib/posts';
import {
  fetchProgressNotes,
  fetchStudentAttendance,
  fetchStudentGroupNames,
  fetchStudentPhotos,
  type ProgressNoteWithAuthor,
  type StudentPhotoWithUrl,
} from '../../lib/parents';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { Attendance, Profile } from '../../types/database';
import { localISODate } from '../../lib/attendance';
import type { PostCardData } from '../../components/PostCard';
import type { ParentStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ParentStackParamList, 'ChildDetail'>;
type Tab = 'progress' | 'gallery';

// Галерея объединяет работы, которые ребёнок публикует сам, и фото,
// загруженные преподавателем; показываем их вместе по дате.
type GalleryItem =
  | { kind: 'post'; id: string; created_at: string; imageUrl: string | null; post: PostCardData }
  | { kind: 'photo'; id: string; created_at: string; imageUrl: string | null; photo: StudentPhotoWithUrl };

const STRINGS = {
  ru: {
    payments: 'Оплаты',
    chatFailed: 'Не удалось открыть чат',
    writeTeacher: 'Написать преподавателю',
    chooseTeacher: 'Кому написать?',
    locale: 'ru-RU',
    noName: 'Без имени',
    progress: 'Прогресс',
    gallery: (n: number) => `Галерея (${n})`,
    teacherNotes: 'Отзывы преподавателей',
    attendance: 'Посещаемость за 30 дней',
    attendanceSummary: (absent: number, late: number) => `Пропусков: ${absent} · опозданий: ${late}`,
    absentOn: 'Не был',
    lateOn: 'Опоздал',
    noAbsences: 'Пропусков нет',
    noNotes: 'Преподаватели ещё не оставляли отзывов',
    noWorks: 'Работ пока нет',
    pending: 'На модерации',
    rejected: 'Отклонено',
    fromClass: 'С занятия',
  },
  kk: {
    payments: 'Төлемдер',
    chatFailed: 'Чатты ашу мүмкін болмады',
    writeTeacher: 'Мұғалімге жазу',
    chooseTeacher: 'Кімге жазу керек?',
    locale: 'kk-KZ',
    noName: 'Аты жоқ',
    progress: 'Үлгерім',
    gallery: (n: number) => `Галерея (${n})`,
    teacherNotes: 'Оқытушылардың пікірлері',
    attendance: 'Соңғы 30 күндегі қатысу',
    attendanceSummary: (absent: number, late: number) => `Жіберілген: ${absent} · кешіккен: ${late}`,
    absentOn: 'Келмеді',
    lateOn: 'Кешікті',
    noAbsences: 'Жіберілген сабақ жоқ',
    noNotes: 'Оқытушылар әлі пікір қалдырмаған',
    noWorks: 'Әзірге жұмыстар жоқ',
    pending: 'Модерацияда',
    rejected: 'Қабылданбады',
    fromClass: 'Сабақтан',
  },
  en: {
    payments: 'Payments',
    chatFailed: 'Could not open the chat',
    writeTeacher: 'Message a teacher',
    chooseTeacher: 'Who do you want to message?',
    locale: 'en-US',
    noName: 'No name',
    progress: 'Progress',
    gallery: (n: number) => `Gallery (${n})`,
    teacherNotes: 'Teacher feedback',
    attendance: 'Attendance, last 30 days',
    attendanceSummary: (absent: number, late: number) => `Absences: ${absent} · late: ${late}`,
    absentOn: 'Absent',
    lateOn: 'Late',
    noAbsences: 'No absences',
    noNotes: 'Teachers haven’t left any feedback yet',
    noWorks: 'No artwork yet',
    pending: 'Under review',
    rejected: 'Rejected',
    fromClass: 'From class',
  },
};

export function ChildDetailScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const { profile: viewer } = useAuth();
  const s = useStrings(STRINGS);
  const [tab, setTab] = useState<Tab>('progress');
  const [child, setChild] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [notes, setNotes] = useState<ProgressNoteWithAuthor[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [teachers, setTeachers] = useState<ChildTeacher[]>([]);
  const [teachersOpen, setTeachersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', childId).single();
      setChild(data as Profile);
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const [groupNames, progress, works, photos, marks] = await Promise.all([
        fetchStudentGroupNames(childId),
        fetchProgressNotes(childId),
        fetchUserPosts(childId, viewer?.id),
        fetchStudentPhotos(childId),
        fetchStudentAttendance(childId, localISODate(since)).catch(() => [] as Attendance[]),
      ]);
      setAttendance(marks);
      setTeachers(await fetchChildTeachers(childId).catch(() => [] as ChildTeacher[]));
      setGroups(groupNames);
      setNotes(progress);
      const items: GalleryItem[] = [
        ...works.map((post) => ({
          kind: 'post' as const,
          id: `post-${post.id}`,
          created_at: post.created_at,
          imageUrl: post.images[0]?.image_url ?? null,
          post,
        })),
        ...photos.map((photo) => ({
          kind: 'photo' as const,
          id: `photo-${photo.id}`,
          created_at: photo.created_at,
          imageUrl: photo.url,
          photo,
        })),
      ];
      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setGallery(items);
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
          <Text style={styles.name}>{child.full_name || s.noName}</Text>
          {groups.length > 0 ? <Text style={styles.groups}>{groups.join(', ')}</Text> : null}
        </View>
      ) : null}

      {FEATURES.payments ? (
        <View style={styles.writeTeacher}>
          <Button title={s.payments} onPress={() => navigation.navigate('Payments', { studentId: childId })} />
        </View>
      ) : null}
      {/* Группы без закреплённого преподавателя: родитель выбирает, кому написать. */}
      {viewer && teachers.length > 0 ? (
        <View style={styles.writeTeacher}>
          <Button title={s.writeTeacher} variant="secondary" onPress={() => setTeachersOpen((v) => !v)} />
          {teachersOpen ? (
            <View style={styles.teacherList}>
              <Text style={styles.teacherHint}>{s.chooseTeacher}</Text>
              {teachers.map((t) => (
                <Pressable
                  key={t.teacher_id}
                  style={styles.teacherRow}
                  onPress={async () => {
                    try {
                      const chatId = await startChat(viewer.id, t.teacher_id, childId);
                      setTeachersOpen(false);
                      navigation.navigate('Chat', { chatId });
                    } catch (e) {
                      Alert.alert(s.chatFailed, errorText(e));
                    }
                  }}
                >
                  <Avatar uri={t.avatar_url} name={t.full_name} size={32} />
                  <Text style={styles.teacherName}>{t.full_name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.segment}>
        {(
          [
            ['progress', s.progress],
            ['gallery', s.gallery(gallery.length)],
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
          <Text style={styles.sectionTitle}>{s.attendance}</Text>
          {(() => {
            const missed = attendance
              .filter((a) => a.status === 'absent' || a.status === 'late')
              .sort((a, b) => b.lesson_date.localeCompare(a.lesson_date));
            const absent = missed.filter((a) => a.status === 'absent').length;
            return (
              <View style={styles.attendance}>
                <Text style={styles.attendanceSummary}>
                  {missed.length === 0 ? s.noAbsences : s.attendanceSummary(absent, missed.length - absent)}
                </Text>
                {missed.slice(0, 10).map((a) => {
                  const [, m, d] = a.lesson_date.split('-');
                  return (
                    <Text key={a.id} style={a.status === 'absent' ? styles.absent : styles.late}>
                      {d}.{m} — {a.status === 'absent' ? s.absentOn : s.lateOn}
                    </Text>
                  );
                })}
              </View>
            );
          })()}
          <Text style={styles.sectionTitle}>{s.teacherNotes}</Text>
          {notes.length === 0 && !loading ? (
            <Text style={styles.empty}>{s.noNotes}</Text>
          ) : null}
          {notes.map((note) => (
            <ProgressNoteCard key={note.id} note={note} />
          ))}
        </>
      ) : (
        <>
          {gallery.length === 0 && !loading ? <Text style={styles.empty}>{s.noWorks}</Text> : null}
          <View style={styles.grid}>
            {gallery.map((item) => (
              <Pressable
                key={item.id}
                style={styles.gridItem}
                onPress={() =>
                  item.kind === 'post'
                    ? navigation.navigate('PostDetail', { postId: item.post.id })
                    : item.imageUrl &&
                      navigation.navigate('PhotoView', { uri: item.imageUrl, caption: item.photo.caption })
                }
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.gridImage} contentFit="cover" />
                ) : (
                  <View style={styles.gridImage} />
                )}
                {item.kind === 'post' && item.post.status !== 'approved' ? (
                  <View style={styles.statusOverlay}>
                    <Text style={styles.statusText}>
                      {item.post.status === 'pending' ? s.pending : s.rejected}
                    </Text>
                  </View>
                ) : null}
                {item.kind === 'photo' ? (
                  <View style={styles.statusOverlay}>
                    <Text style={styles.statusText}>{s.fromClass}</Text>
                  </View>
                ) : null}
                <Text style={styles.gridDate} numberOfLines={1}>
                  {new Date(item.created_at).toLocaleDateString(s.locale, { day: 'numeric', month: 'short' })}
                  {item.kind === 'photo' && item.photo.caption ? ` · ${item.photo.caption}` : ''}
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
  attendance: { marginBottom: spacing.lg, gap: 2 },
  attendanceSummary: { color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  absent: { color: colors.danger },
  late: { color: colors.warning },
  writeTeacher: { marginBottom: spacing.sm },
  teacherList: { marginTop: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.sm },
  teacherHint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  teacherName: { color: colors.text, fontWeight: '600' },
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
