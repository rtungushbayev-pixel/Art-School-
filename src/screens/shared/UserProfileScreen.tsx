import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ProfileHeader } from '../../components/ProfileHeader';
import { Button } from '../../components/Button';
import { PortfolioSections } from '../../components/PortfolioSections';
import { ProfileTabs, type ProfileTab } from '../../components/ProfileTabs';
import { supabase } from '../../lib/supabase';
import {
  deleteProgressNote,
  deleteStudentPhoto,
  fetchChildren,
  fetchStudentPhotos,
  fetchParents,
  fetchProgressNotes,
  unlinkChild,
  type ProgressNoteWithAuthor,
  type StudentPhotoWithUrl,
} from '../../lib/parents';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { ProgressNoteCard } from '../../components/ProgressNoteCard';
import { useAuth } from '../../hooks/useAuth';
import {
  acceptFriendRequest,
  fetchFriendsData,
  friendStateOf,
  sendFriendRequest,
  unblockUser,
  type FriendState,
} from '../../lib/friends';
import { useStudentPortfolio } from '../../hooks/useStudentPortfolio';
import { colors, spacing } from '../../theme/colors';
import type { Profile, UserRole } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const ROLE_CHANGE: Record<UserRole, { button: string; question: (name: string) => string }> = {
  staff: {
    button: 'Сделать сотрудником',
    question: (name) => `${name} получит права сотрудника: модерация, группы, расписание и сообщения.`,
  },
  student: {
    button: 'Сделать учеником',
    question: (name) => `${name} станет учеником.`,
  },
  parent: {
    button: 'Сделать родителем',
    question: (name) =>
      `${name} станет родителем: увидит прогресс и работы детей, которых вы к нему привяжете. Свои работы публиковать не сможет.`,
  },
};

const FRIEND_BUTTON: Record<FriendState, string> = {
  none: 'Пригласить в друзья',
  outgoing: 'Приглашение отправлено',
  incoming: 'Принять приглашение в друзья',
  friends: 'Вы друзья',
  blocked: 'Разблокировать',
};

const ROLE_ORDER: UserRole[] = ['student', 'parent', 'staff'];

export function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'UserProfile'>>();
  const { profile: viewer } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [changingRole, setChangingRole] = useState<UserRole | null>(null);
  const [children, setChildren] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [notes, setNotes] = useState<ProgressNoteWithAuthor[]>([]);
  const [photos, setPhotos] = useState<StudentPhotoWithUrl[]>([]);
  const [friendState, setFriendState] = useState<FriendState | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('profile');

  const userId = route.params.userId;
  const viewerIsStaff = viewer?.role === 'staff';
  const { posts, achievements, groups } = useStudentPortfolio(userId, viewer?.id);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    const loaded = data as Profile;
    setProfile(loaded);
    // Друзья — между учениками и преподавателями.
    const friendRoles = ['student', 'staff'];
    if (viewer && loaded && viewer.id !== loaded.id && friendRoles.includes(viewer.role) && friendRoles.includes(loaded.role)) {
      try {
        setFriendState(friendStateOf(await fetchFriendsData(viewer.id), loaded.id));
      } catch {
        setFriendState(null);
      }
    } else {
      setFriendState(null);
    }
    // Блоки «Дети» и «Прогресс» — инструмент сотрудника; RLS всё равно не
    // отдаст эти данные посторонним.
    if (viewerIsStaff && loaded) {
      setChildren(loaded.role === 'parent' ? await fetchChildren(userId) : []);
      if (loaded.role === 'student') {
        const [parentList, noteList, photoList] = await Promise.all([
          fetchParents(userId),
          fetchProgressNotes(userId),
          fetchStudentPhotos(userId),
        ]);
        setParents(parentList);
        setNotes(noteList);
        setPhotos(photoList);
      } else {
        setParents([]);
        setNotes([]);
        setPhotos([]);
      }
    }
  }, [userId, viewer, viewerIsStaff]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changeRole = (role: UserRole) => {
    if (!profile) return;
    const question = ROLE_CHANGE[role].question(profile.full_name);
    Alert.alert('Изменить роль?', question, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Изменить',
        style: profile.role === 'staff' ? 'destructive' : 'default',
        onPress: async () => {
          setChangingRole(role);
          const { error } = await supabase.rpc('set_user_role', { p_user_id: profile.id, p_role: role });
          setChangingRole(null);
          if (error) {
            Alert.alert('Не удалось изменить роль', error.message);
          } else {
            load();
          }
        },
      },
    ]);
  };

  const onUnlinkChild = (child: Profile) => {
    if (!profile) return;
    Alert.alert('Отвязать ребёнка?', `${profile.full_name} больше не увидит прогресс и работы ${child.full_name}.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отвязать',
        style: 'destructive',
        onPress: async () => {
          try {
            await unlinkChild(profile.id, child.id);
            load();
          } catch (e) {
            Alert.alert('Не удалось отвязать', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  const onDeleteNote = (note: ProgressNoteWithAuthor) => {
    Alert.alert('Удалить отзыв?', note.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProgressNote(note.id);
            load();
          } catch (e) {
            Alert.alert('Не удалось удалить', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  const onDeletePhoto = (photo: StudentPhotoWithUrl) => {
    Alert.alert('Удалить фото из галереи?', photo.caption ?? undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudentPhoto(photo);
            load();
          } catch (e) {
            Alert.alert('Не удалось удалить', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  const onFriendPress = async () => {
    if (!viewer || !profile || !friendState) return;
    setFriendBusy(true);
    try {
      if (friendState === 'none') await sendFriendRequest(viewer.id, profile.id);
      else if (friendState === 'incoming') await acceptFriendRequest(viewer.id, profile.id);
      else if (friendState === 'blocked') await unblockUser(viewer.id, profile.id);
      await load();
    } catch (e) {
      Alert.alert('Не получилось', e instanceof Error ? e.message : undefined);
    }
    setFriendBusy(false);
  };

  if (!profile) {
    return (
      <Screen>
        <Text style={styles.empty}>Загрузка…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ProfileHeader profile={profile} groups={groups} />
      {friendState ? (
        <View style={styles.friendAction}>
          <Button
            title={FRIEND_BUTTON[friendState]}
            variant={friendState === 'none' || friendState === 'incoming' ? 'primary' : 'secondary'}
            disabled={friendState === 'friends' || friendState === 'outgoing'}
            loading={friendBusy}
            onPress={onFriendPress}
          />
        </View>
      ) : null}
      {viewerIsStaff && viewer?.id !== profile.id ? (
        <View style={styles.roleAction}>
          {ROLE_ORDER.filter((role) => role !== profile.role).map((role) => (
            <Button
              key={role}
              title={ROLE_CHANGE[role].button}
              variant="secondary"
              onPress={() => changeRole(role)}
              loading={changingRole === role}
              disabled={changingRole !== null}
            />
          ))}
        </View>
      ) : null}

      {viewerIsStaff && profile.role === 'parent' ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>Дети ({children.length})</Text>
            <Pressable onPress={() => navigation.navigate('LinkChild', { parentId: profile.id })}>
              <Text style={styles.addLink}>+ Привязать</Text>
            </Pressable>
          </View>
          {children.length === 0 ? <Text style={styles.emptyLeft}>Дети ещё не привязаны</Text> : null}
          {children.map((child) => (
            <Card key={child.id} style={styles.personRow}>
              <Avatar uri={child.avatar_url} name={child.full_name} size={36} />
              <Text style={styles.personName}>{child.full_name}</Text>
              <Pressable onPress={() => onUnlinkChild(child)} hitSlop={8}>
                <Text style={styles.remove}>Отвязать</Text>
              </Pressable>
            </Card>
          ))}
        </>
      ) : null}

      {viewerIsStaff && profile.role === 'student' ? (
        <>
          <Button
            title="Оплаты ученика"
            variant="secondary"
            onPress={() => navigation.navigate('Payments', { studentId: profile.id })}
          />
          <View style={{ height: spacing.sm }} />
          {parents.length > 0 ? (
            <Text style={styles.parents}>Родители: {parents.map((p) => p.full_name).join(', ')}</Text>
          ) : null}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>Прогресс</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('AddProgressNote', { studentId: profile.id, studentName: profile.full_name })
              }
            >
              <Text style={styles.addLink}>+ Отзыв</Text>
            </Pressable>
          </View>
          {notes.length === 0 ? <Text style={styles.emptyLeft}>Отзывов пока нет</Text> : null}
          {notes.map((note) => (
            <ProgressNoteCard key={note.id} note={note} onDelete={() => onDeleteNote(note)} />
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>Фото с занятий</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('AddStudentPhoto', { studentId: profile.id, studentName: profile.full_name })
              }
            >
              <Text style={styles.addLink}>+ Фото</Text>
            </Pressable>
          </View>
          {photos.length === 0 ? (
            <Text style={styles.emptyLeft}>Фото пока нет. Их увидят ученик и родители.</Text>
          ) : (
            <View style={[styles.grid, styles.photoGrid]}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={styles.gridItem}
                  onPress={() => photo.url && navigation.navigate('PhotoView', { uri: photo.url, caption: photo.caption })}
                  onLongPress={() => onDeletePhoto(photo)}
                >
                  {photo.url ? (
                    <Image source={{ uri: photo.url }} style={styles.gridImage} contentFit="cover" />
                  ) : (
                    <View style={styles.gridImage} />
                  )}
                </Pressable>
              ))}
              <Text style={styles.photoHint}>Удерживайте фото, чтобы удалить его.</Text>
            </View>
          )}
        </>
      ) : null}
      <ProfileTabs value={tab} onChange={setTab} />
      <PortfolioSections
        show={tab}
        posts={posts}
        achievements={achievements}
        isStudent={profile.role === 'student'}
        isOwner={viewer?.id === profile.id}
        canEditAchievements={viewerIsStaff || viewer?.id === profile.id}
        onOpenPost={(postId) => navigation.navigate('PostDetail', { postId })}
        onOpenPortfolio={() => navigation.navigate('Portfolio', { userId: profile.id })}
        onAddAchievement={() => navigation.navigate('EditAchievement', { studentId: profile.id })}
        onEditAchievement={(a) =>
          navigation.navigate('EditAchievement', { studentId: profile.id, achievementId: a.id })
        }
      />
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  friendAction: { marginBottom: spacing.sm },
  roleAction: { marginBottom: spacing.md, gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitleInline: { fontSize: 16, fontWeight: '700', color: colors.primary },
  addLink: { color: colors.primary, fontWeight: '700' },
  emptyLeft: { color: colors.textMuted, marginBottom: spacing.md },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personName: { flex: 1, fontWeight: '600', color: colors.text },
  remove: { color: colors.danger, fontWeight: '600' },
  parents: { color: colors.textMuted, marginBottom: spacing.sm },
  photoGrid: { marginBottom: spacing.md },
  photoHint: { width: '100%', color: colors.textMuted, fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: { width: '32%', aspectRatio: 1 },
  gridImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.border },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
