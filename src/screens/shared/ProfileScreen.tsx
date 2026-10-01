import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ProfileHeader } from '../../components/ProfileHeader';
import { PortfolioSections } from '../../components/PortfolioSections';
import { useAuth } from '../../hooks/useAuth';
import { useStudentPortfolio } from '../../hooks/useStudentPortfolio';
import { spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile, signOut } = useAuth();
  const { posts, achievements, groups } = useStudentPortfolio(profile?.id, profile?.id);

  if (!profile) return null;

  return (
    <Screen scroll>
      <ProfileHeader profile={profile} groups={groups} />

      <Button title="Редактировать профиль" variant="secondary" onPress={() => navigation.navigate('EditProfile')} />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Уведомления"
        variant="secondary"
        onPress={() => navigation.navigate('NotificationSettings')}
      />
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
      <View style={{ height: spacing.sm }} />
      <Button
        title={profile.role === 'staff' ? 'Обращения пользователей' : 'Помощь'}
        variant="secondary"
        onPress={() => navigation.navigate('Support')}
      />
      <View style={{ height: spacing.sm }} />
      <Button title="Выйти" variant="danger" onPress={signOut} />

      <View style={{ height: spacing.md }} />
      <PortfolioSections
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
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
