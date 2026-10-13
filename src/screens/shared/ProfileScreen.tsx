import React, { useEffect, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { DeleteAccountButton } from '../../components/DeleteAccountButton';
import { ProfileHeader } from '../../components/ProfileHeader';
import { PortfolioSections } from '../../components/PortfolioSections';
import { ProfileTabs, type ProfileTab } from '../../components/ProfileTabs';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { FEATURES } from '../../lib/features';
import { changeProfileAvatar } from '../../lib/avatar';
import { supabase } from '../../lib/supabase';
import { isAdminRole, isStaffRole } from '../../lib/roles';
import { fetchHeadedBranch } from '../../lib/materials';
import { useStudentPortfolio } from '../../hooks/useStudentPortfolio';
import { colors, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STRINGS = {
  ru: {
    profileSettings: 'Настройки профиля',
    chats: 'Чаты с родителями',
    avatarFailed: 'Не удалось загрузить фото',
    inviteStaff: 'Пригласить сотрудника',
    inviteText: (code: string) => `Приглашение в приложение KasteyevSchool для сотрудника школы. На экране регистрации нажмите «Я сотрудник школы» и введите код: ${code}. Код действует 7 дней.`,
    inviteFailed: 'Не удалось создать приглашение',
    chooseRole: 'Кем будет новый сотрудник?',
    roleTeacher: 'Преподаватель',
    roleAdmin: 'Администратор',
    roleOffice: 'Администрация (заявки на материалы)',
    materials: 'Заявки на материалы',
    attendanceSummary: 'Сводка посещаемости',
    branchQr: 'QR-коды филиалов',
    cancel: 'Отмена',
    studentPayments: 'Оплаты учеников',
    myPayments: 'Мои оплаты',
    signOut: 'Выйти',
  },
  kk: {
    profileSettings: 'Профиль баптаулары',
    chats: 'Ата-аналармен чаттар',
    avatarFailed: 'Фотоны жүктеу мүмкін болмады',
    inviteStaff: 'Қызметкерді шақыру',
    inviteText: (code: string) => `Мектеп қызметкеріне арналған KasteyevSchool қолданбасына шақыру. Тіркелу бетінде «Мен мектеп қызметкерімін» түймесін басып, кодты енгізіңіз: ${code}. Код 7 күн жарамды.`,
    inviteFailed: 'Шақыру жасау мүмкін болмады',
    chooseRole: 'Жаңа қызметкер кім болады?',
    roleTeacher: 'Мұғалім',
    roleAdmin: 'Әкімші',
    roleOffice: 'Әкімшілік (материалдарға өтінімдер)',
    materials: 'Материалдарға өтінімдер',
    attendanceSummary: 'Қатысу жиынтығы',
    branchQr: 'Филиалдардың QR-кодтары',
    cancel: 'Бас тарту',
    studentPayments: 'Оқушылардың төлемдері',
    myPayments: 'Менің төлемдерім',
    signOut: 'Шығу',
  },
  en: {
    profileSettings: 'Profile settings',
    chats: 'Chats with parents',
    avatarFailed: 'Could not upload the photo',
    inviteStaff: 'Invite a staff member',
    inviteText: (code: string) => `Invitation to the KasteyevSchool app for school staff. On the sign-up screen tap "I'm school staff" and enter the code: ${code}. The code is valid for 7 days.`,
    inviteFailed: 'Could not create an invitation',
    chooseRole: 'What role will the new staff member have?',
    roleTeacher: 'Teacher',
    roleAdmin: 'Administrator',
    roleOffice: 'Administration (supply requests)',
    materials: 'Supply requests',
    attendanceSummary: 'Attendance summary',
    branchQr: 'Branch QR codes',
    cancel: 'Cancel',
    studentPayments: 'Student payments',
    myPayments: 'My payments',
    signOut: 'Sign out',
  },
};

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile, signOut, refreshProfile } = useAuth();
  const s = useStrings(STRINGS);
  const { posts, achievements, groups } = useStudentPortfolio(profile?.id, profile?.id);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('profile');
  const [headsBranch, setHeadsBranch] = useState(false);

  // Заявки на материалы: у руководителей филиалов и у администратора.
  useEffect(() => {
    if (!profile || !isStaffRole(profile.role)) return;
    fetchHeadedBranch(profile.id)
      .then((b) => setHeadsBranch(b !== null))
      .catch(() => {});
  }, [profile]);

  const onAvatarPress = async () => {
    if (!profile) return;
    setAvatarUploading(true);
    try {
      if (await changeProfileAvatar(profile.id)) await refreshProfile();
    } catch (e) {
      Alert.alert(s.avatarFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!profile) return null;

  return (
    <Screen scroll>
      <ProfileHeader
        profile={profile}
        groups={groups}
        onAvatarPress={onAvatarPress}
        avatarUploading={avatarUploading}
      />

      <Button title={s.profileSettings} onPress={() => navigation.navigate('ProfileSettings')} />

      <ProfileTabs value={tab} onChange={setTab} />

      <PortfolioSections
        show={tab}
        posts={posts}
        achievements={achievements}
        isStudent={profile.role === 'student'}
        isOwner
        canEditAchievements
        onOpenPost={(postId) => navigation.navigate('PostDetail', { postId })}
        onOpenPortfolio={() => navigation.navigate('Portfolio', { userId: profile.id })}
        onAddAchievement={() => navigation.navigate('EditAchievement', { studentId: profile.id })}
        onEditAchievement={(a) =>
          navigation.navigate('EditAchievement', { studentId: profile.id, achievementId: a.id })
        }
      />

      {tab === 'profile' ? (
        <>
          <View style={{ height: spacing.lg }} />
          {isAdminRole(profile.role) ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button
                title={s.attendanceSummary}
                variant="secondary"
                onPress={() => navigation.navigate('AttendanceSummary')}
              />
              {FEATURES.qrCheckIn ? (
                <>
                  <View style={{ height: spacing.sm }} />
                  <Button title={s.branchQr} variant="secondary" onPress={() => navigation.navigate('BranchQr')} />
                </>
              ) : null}
            </>
          ) : null}
          {isStaffRole(profile.role) ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button title={s.chats} variant="secondary" onPress={() => navigation.navigate('Chats')} />
            </>
          ) : null}
          {headsBranch || isAdminRole(profile.role) ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button
                title={s.materials}
                variant="secondary"
                onPress={() => navigation.navigate('MaterialRequests')}
              />
            </>
          ) : null}
          {isAdminRole(profile.role) ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button
                title={s.inviteStaff}
                variant="secondary"
                onPress={() => {
                  // Одноразовый код с ролью: по нему новый сотрудник регистрируется сам.
                  const invite = async (role: 'staff' | 'admin' | 'office') => {
                    const { data, error } = await supabase.rpc('create_staff_invite', { p_role: role, p_note: null });
                    if (error || !data) Alert.alert(s.inviteFailed, error?.message);
                    else Share.share({ message: s.inviteText(String(data)) }).catch(() => {});
                  };
                  // На Android в окне не больше трёх кнопок: там «Отмена» — касание мимо окна.
                  Alert.alert(
                    s.inviteStaff,
                    s.chooseRole,
                    [
                      { text: s.roleTeacher, onPress: () => invite('staff') },
                      { text: s.roleOffice, onPress: () => invite('office') },
                      { text: s.roleAdmin, onPress: () => invite('admin') },
                      ...(Platform.OS === 'ios' ? [{ text: s.cancel, style: 'cancel' as const }] : []),
                    ],
                    { cancelable: true }
                  );
                }}
              />
            </>
          ) : null}
          {FEATURES.payments && profile.role !== 'office' ? (
            <>
              <View style={{ height: spacing.sm }} />
              {isAdminRole(profile.role) ? (
                <Button
                  title={s.studentPayments}
                  variant="secondary"
                  onPress={() => navigation.navigate('StudentBalances')}
                />
              ) : (
                <Button title={s.myPayments} variant="secondary" onPress={() => navigation.navigate('Payments')} />
              )}
            </>
          ) : null}
          <View style={{ height: spacing.sm }} />
          <Button title={s.signOut} variant="danger" onPress={signOut} />
          <DeleteAccountButton />
        </>
      ) : null}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
});
