import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ProfileHeader } from '../../components/ProfileHeader';
import { PortfolioSections } from '../../components/PortfolioSections';
import { ProfileTabs, type ProfileTab } from '../../components/ProfileTabs';
import { useAuth } from '../../hooks/useAuth';
import { FEATURES } from '../../lib/features';
import { changeProfileAvatar } from '../../lib/avatar';
import { useStudentPortfolio } from '../../hooks/useStudentPortfolio';
import { spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile, signOut, refreshProfile } = useAuth();
  const { posts, achievements, groups } = useStudentPortfolio(profile?.id, profile?.id);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('profile');

  const onAvatarPress = async () => {
    if (!profile) return;
    setAvatarUploading(true);
    try {
      if (await changeProfileAvatar(profile.id)) await refreshProfile();
    } catch (e) {
      Alert.alert('Не удалось загрузить фото', e instanceof Error ? e.message : undefined);
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

      <Button title="Редактировать профиль" onPress={() => navigation.navigate('EditProfile')} />

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
            title="Уведомления"
            variant="secondary"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          {FEATURES.payments ? (
            <>
              <View style={{ height: spacing.sm }} />
              {profile.role === 'staff' ? (
                <Button
                  title="Оплаты учеников"
                  variant="secondary"
                  onPress={() => navigation.navigate('StudentBalances')}
                />
              ) : (
                <Button title="Мои оплаты" variant="secondary" onPress={() => navigation.navigate('Payments')} />
              )}
            </>
          ) : null}
          <View style={{ height: spacing.sm }} />
          <Button title="Выйти" variant="danger" onPress={signOut} />
        </>
      ) : null}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
