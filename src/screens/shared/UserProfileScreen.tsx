import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ProfileHeader } from '../../components/ProfileHeader';
import { Button } from '../../components/Button';
import { PortfolioSections } from '../../components/PortfolioSections';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useStudentPortfolio } from '../../hooks/useStudentPortfolio';
import { colors, spacing } from '../../theme/colors';
import type { Profile, UserRole } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'UserProfile'>>();
  const { profile: viewer } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  const userId = route.params.userId;
  const { posts, achievements, groups } = useStudentPortfolio(userId, viewer?.id);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data as Profile);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changeRole = (role: UserRole) => {
    if (!profile) return;
    const question =
      role === 'staff'
        ? `${profile.full_name} получит права сотрудника: модерация, оценки, посещаемость и объявления.`
        : `${profile.full_name} потеряет права сотрудника и станет учеником.`;
    Alert.alert('Изменить роль?', question, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Изменить',
        style: role === 'staff' ? 'default' : 'destructive',
        onPress: async () => {
          setChangingRole(true);
          const { error } = await supabase.rpc('set_user_role', { p_user_id: profile.id, p_role: role });
          setChangingRole(false);
          if (error) {
            Alert.alert('Не удалось изменить роль', error.message);
          } else {
            load();
          }
        },
      },
    ]);
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
      {viewer?.role === 'staff' && viewer.id !== profile.id ? (
        <View style={styles.roleAction}>
          {profile.role === 'staff' ? (
            <Button
              title="Сделать учеником"
              variant="secondary"
              onPress={() => changeRole('student')}
              loading={changingRole}
            />
          ) : (
            <Button
              title="Сделать сотрудником"
              variant="secondary"
              onPress={() => changeRole('staff')}
              loading={changingRole}
            />
          )}
        </View>
      ) : null}
      <PortfolioSections
        posts={posts}
        achievements={achievements}
        isStudent={profile.role === 'student'}
        isOwner={viewer?.id === profile.id}
        canEditAchievements={viewer?.role === 'staff' || viewer?.id === profile.id}
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
  roleAction: { marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
