import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ProfileHeader } from '../../components/ProfileHeader';
import { PortfolioSections } from '../../components/PortfolioSections';
import { ProfileTabs, type ProfileTab } from '../../components/ProfileTabs';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { FEATURES } from '../../lib/features';
import { changeProfileAvatar } from '../../lib/avatar';
import { useStudentPortfolio } from '../../hooks/useStudentPortfolio';
import { colors, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STRINGS = {
  ru: {
    avatarFailed: 'Не удалось загрузить фото',
    editProfile: 'Редактировать профиль',
    notifications: 'Уведомления',
    language: 'Язык приложения',
    studentPayments: 'Оплаты учеников',
    myPayments: 'Мои оплаты',
    signOut: 'Выйти',
  },
  kk: {
    avatarFailed: 'Фотоны жүктеу мүмкін болмады',
    editProfile: 'Профильді өңдеу',
    notifications: 'Хабарландырулар',
    language: 'Қолданба тілі',
    studentPayments: 'Оқушылардың төлемдері',
    myPayments: 'Менің төлемдерім',
    signOut: 'Шығу',
  },
  en: {
    avatarFailed: 'Could not upload the photo',
    editProfile: 'Edit profile',
    notifications: 'Notifications',
    language: 'App language',
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

      <Button title={s.editProfile} onPress={() => navigation.navigate('EditProfile')} />

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
          <Button
            title={s.notifications}
            variant="secondary"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <Text style={styles.sectionLabel}>{s.language}</Text>
          <LanguageSwitcher />
          {FEATURES.payments ? (
            <>
              <View style={{ height: spacing.sm }} />
              {profile.role === 'staff' ? (
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
        </>
      ) : null}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
