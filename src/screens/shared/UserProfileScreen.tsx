import React, { useCallback, useState } from 'react';
import { isAdminRole, isStaffRole } from '../../lib/roles';
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
import { useStrings } from '../../i18n';
import { FEATURES } from '../../lib/features';
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

type RoleChange = Record<UserRole, { button: string; question: (name: string) => string }>;

const STRINGS = {
  ru: {
    roleChange: {
      staff: {
        button: 'Сделать преподавателем',
        question: (name: string) =>
          `${name} станет преподавателем: модерация, сообщения, прогресс учеников и свои группы.`,
      },
      admin: {
        button: 'Сделать администратором',
        question: (name: string) =>
          `${name} станет администратором: все права, включая роли, приглашения сотрудников, все группы, коды учеников и телефоны.`,
      },
      student: {
        button: 'Сделать учеником',
        question: (name: string) => `${name} станет учеником.`,
      },
      parent: {
        button: 'Сделать родителем',
        question: (name: string) =>
          `${name} станет родителем: увидит прогресс и работы детей, которых вы к нему привяжете. Свои работы публиковать не сможет.`,
      },
    } as RoleChange,
    friendButton: {
      none: 'Пригласить в друзья',
      outgoing: 'Приглашение отправлено',
      incoming: 'Принять приглашение в друзья',
      friends: 'Вы друзья',
      blocked: 'Разблокировать',
    } as Record<FriendState, string>,
    changeRoleQ: 'Изменить роль?',
    cancel: 'Отмена',
    change: 'Изменить',
    changeRoleFailed: 'Не удалось изменить роль',
    unlinkChildQ: 'Отвязать ребёнка?',
    unlinkChildText: (parent: string, child: string) => `${parent} больше не увидит прогресс и работы ${child}.`,
    unlink: 'Отвязать',
    unlinkFailed: 'Не удалось отвязать',
    deleteNoteQ: 'Удалить отзыв?',
    delete: 'Удалить',
    deleteFailed: 'Не удалось удалить',
    deletePhotoQ: 'Удалить фото из галереи?',
    failed: 'Не получилось',
    loading: 'Загрузка…',
    children: (n: number) => `Дети (${n})`,
    link: '+ Привязать',
    noChildren: 'Дети ещё не привязаны',
    payments: 'Оплаты ученика',
    parents: (names: string) => `Родители: ${names}`,
    progress: 'Прогресс',
    addNote: '+ Отзыв',
    noNotes: 'Отзывов пока нет',
    classPhotos: 'Фото с занятий',
    addPhoto: '+ Фото',
    noPhotos: 'Фото пока нет. Их увидят ученик и родители.',
    photoHint: 'Удерживайте фото, чтобы удалить его.',
  },
  kk: {
    roleChange: {
      staff: {
        button: 'Мұғалім ету',
        question: (name: string) =>
          `${name} мұғалім болады: модерация, хабарламалар, оқушылардың үлгерімі және өз топтары.`,
      },
      admin: {
        button: 'Әкімші ету',
        question: (name: string) =>
          `${name} әкімші болады: барлық құқықтар, соның ішінде рөлдер, қызметкерлерді шақыру, барлық топтар, оқушы кодтары және телефондар.`,
      },
      student: {
        button: 'Оқушы ету',
        question: (name: string) => `${name} оқушы болады.`,
      },
      parent: {
        button: 'Ата-ана ету',
        question: (name: string) =>
          `${name} ата-ана болады: сіз оған байланыстыратын балалардың прогресі мен жұмыстарын көреді. Өз жұмыстарын жариялай алмайды.`,
      },
    } as RoleChange,
    friendButton: {
      none: 'Достыққа шақыру',
      outgoing: 'Шақыру жіберілді',
      incoming: 'Достыққа шақыруды қабылдау',
      friends: 'Сіздер доссыздар',
      blocked: 'Бұғаттан шығару',
    } as Record<FriendState, string>,
    changeRoleQ: 'Рөлді өзгерту керек пе?',
    cancel: 'Бас тарту',
    change: 'Өзгерту',
    changeRoleFailed: 'Рөлді өзгерту мүмкін болмады',
    unlinkChildQ: 'Баланы ажырату керек пе?',
    unlinkChildText: (parent: string, child: string) =>
      `${parent} бұдан былай мына баланың прогресі мен жұмыстарын көрмейді: ${child}.`,
    unlink: 'Ажырату',
    unlinkFailed: 'Ажырату мүмкін болмады',
    deleteNoteQ: 'Пікірді жою керек пе?',
    delete: 'Жою',
    deleteFailed: 'Жою мүмкін болмады',
    deletePhotoQ: 'Фотоны галереядан жою керек пе?',
    failed: 'Сәтсіз аяқталды',
    loading: 'Жүктелуде…',
    children: (n: number) => `Балалар (${n})`,
    link: '+ Байланыстыру',
    noChildren: 'Балалар әлі байланыстырылмаған',
    payments: 'Оқушының төлемдері',
    parents: (names: string) => `Ата-аналары: ${names}`,
    progress: 'Прогресс',
    addNote: '+ Пікір',
    noNotes: 'Әзірге пікірлер жоқ',
    classPhotos: 'Сабақтағы фотолар',
    addPhoto: '+ Фото',
    noPhotos: 'Әзірге фото жоқ. Оларды оқушы мен ата-аналары көреді.',
    photoHint: 'Фотоны жою үшін оны басып тұрыңыз.',
  },
  en: {
    roleChange: {
      staff: {
        button: 'Make teacher',
        question: (name: string) =>
          `${name} will become a teacher: moderation, messages, student progress and their own groups.`,
      },
      admin: {
        button: 'Make administrator',
        question: (name: string) =>
          `${name} will become an administrator: all rights, including roles, staff invitations, all groups, student codes and phone numbers.`,
      },
      student: {
        button: 'Make student',
        question: (name: string) => `${name} will become a student.`,
      },
      parent: {
        button: 'Make parent',
        question: (name: string) =>
          `${name} will become a parent: they will see the progress and works of the children you link to them. They will not be able to publish their own works.`,
      },
    } as RoleChange,
    friendButton: {
      none: 'Add friend',
      outgoing: 'Invitation sent',
      incoming: 'Accept friend request',
      friends: 'You are friends',
      blocked: 'Unblock',
    } as Record<FriendState, string>,
    changeRoleQ: 'Change role?',
    cancel: 'Cancel',
    change: 'Change',
    changeRoleFailed: 'Could not change the role',
    unlinkChildQ: 'Unlink child?',
    unlinkChildText: (parent: string, child: string) =>
      `${parent} will no longer see the progress and works of ${child}.`,
    unlink: 'Unlink',
    unlinkFailed: 'Could not unlink',
    deleteNoteQ: 'Delete this review?',
    delete: 'Delete',
    deleteFailed: 'Could not delete',
    deletePhotoQ: 'Delete this photo from the gallery?',
    failed: 'Something went wrong',
    loading: 'Loading…',
    children: (n: number) => `Children (${n})`,
    link: '+ Link',
    noChildren: 'No children linked yet',
    payments: 'Student payments',
    parents: (names: string) => `Parents: ${names}`,
    progress: 'Progress',
    addNote: '+ Review',
    noNotes: 'No reviews yet',
    classPhotos: 'Class photos',
    addPhoto: '+ Photo',
    noPhotos: 'No photos yet. The student and parents will see them.',
    photoHint: 'Press and hold a photo to delete it.',
  },
};

const ROLE_ORDER: UserRole[] = ['student', 'parent', 'staff', 'admin'];

export function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'UserProfile'>>();
  const { profile: viewer } = useAuth();
  const s = useStrings(STRINGS);
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
  const viewerIsStaff = isStaffRole(viewer?.role);
  const { posts, achievements, groups } = useStudentPortfolio(userId, viewer?.id);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    const loaded = data as Profile;
    setProfile(loaded);
    // Друзья — между учениками и преподавателями.
    const friendRoles = ['student', 'staff', 'admin'];
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
    const question = s.roleChange[role].question(profile.full_name);
    Alert.alert(s.changeRoleQ, question, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.change,
        style: isStaffRole(profile.role) ? 'destructive' : 'default',
        onPress: async () => {
          setChangingRole(role);
          const { error } = await supabase.rpc('set_user_role', { p_user_id: profile.id, p_role: role });
          setChangingRole(null);
          if (error) {
            Alert.alert(s.changeRoleFailed, error.message);
          } else {
            load();
          }
        },
      },
    ]);
  };

  const onUnlinkChild = (child: Profile) => {
    if (!profile) return;
    Alert.alert(s.unlinkChildQ, s.unlinkChildText(profile.full_name, child.full_name), [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.unlink,
        style: 'destructive',
        onPress: async () => {
          try {
            await unlinkChild(profile.id, child.id);
            load();
          } catch (e) {
            Alert.alert(s.unlinkFailed, e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  const onDeleteNote = (note: ProgressNoteWithAuthor) => {
    Alert.alert(s.deleteNoteQ, note.title, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProgressNote(note.id);
            load();
          } catch (e) {
            Alert.alert(s.deleteFailed, e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  const onDeletePhoto = (photo: StudentPhotoWithUrl) => {
    Alert.alert(s.deletePhotoQ, photo.caption ?? undefined, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudentPhoto(photo);
            load();
          } catch (e) {
            Alert.alert(s.deleteFailed, e instanceof Error ? e.message : undefined);
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
      Alert.alert(s.failed, e instanceof Error ? e.message : undefined);
    }
    setFriendBusy(false);
  };

  if (!profile) {
    return (
      <Screen>
        <Text style={styles.empty}>{s.loading}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ProfileHeader profile={profile} groups={groups} />
      {friendState ? (
        <View style={styles.friendAction}>
          <Button
            title={s.friendButton[friendState]}
            variant={friendState === 'none' || friendState === 'incoming' ? 'primary' : 'secondary'}
            disabled={friendState === 'friends' || friendState === 'outgoing'}
            loading={friendBusy}
            onPress={onFriendPress}
          />
        </View>
      ) : null}
      {isAdminRole(viewer?.role) && viewer?.id !== profile.id ? (
        <View style={styles.roleAction}>
          {ROLE_ORDER.filter((role) => role !== profile.role).map((role) => (
            <Button
              key={role}
              title={s.roleChange[role].button}
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
            <Text style={styles.sectionTitleInline}>{s.children(children.length)}</Text>
            <Pressable onPress={() => navigation.navigate('LinkChild', { parentId: profile.id })}>
              <Text style={styles.addLink}>{s.link}</Text>
            </Pressable>
          </View>
          {children.length === 0 ? <Text style={styles.emptyLeft}>{s.noChildren}</Text> : null}
          {children.map((child) => (
            <Card key={child.id} style={styles.personRow}>
              <Avatar uri={child.avatar_url} name={child.full_name} size={36} />
              <Text style={styles.personName}>{child.full_name}</Text>
              <Pressable onPress={() => onUnlinkChild(child)} hitSlop={8}>
                <Text style={styles.remove}>{s.unlink}</Text>
              </Pressable>
            </Card>
          ))}
        </>
      ) : null}

      {viewerIsStaff && profile.role === 'student' ? (
        <>
          {FEATURES.payments ? (
            <>
              <Button
                title={s.payments}
                variant="secondary"
                onPress={() => navigation.navigate('Payments', { studentId: profile.id })}
              />
              <View style={{ height: spacing.sm }} />
            </>
          ) : null}
          {parents.length > 0 ? (
            <Text style={styles.parents}>{s.parents(parents.map((p) => p.full_name).join(', '))}</Text>
          ) : null}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>{s.progress}</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('AddProgressNote', { studentId: profile.id, studentName: profile.full_name })
              }
            >
              <Text style={styles.addLink}>{s.addNote}</Text>
            </Pressable>
          </View>
          {notes.length === 0 ? <Text style={styles.emptyLeft}>{s.noNotes}</Text> : null}
          {notes.map((note) => (
            <ProgressNoteCard key={note.id} note={note} onDelete={() => onDeleteNote(note)} />
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>{s.classPhotos}</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('AddStudentPhoto', { studentId: profile.id, studentName: profile.full_name })
              }
            >
              <Text style={styles.addLink}>{s.addPhoto}</Text>
            </Pressable>
          </View>
          {photos.length === 0 ? (
            <Text style={styles.emptyLeft}>{s.noPhotos}</Text>
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
              <Text style={styles.photoHint}>{s.photoHint}</Text>
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
