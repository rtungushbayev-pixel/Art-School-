import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ProfileHeader } from '../../components/ProfileHeader';
import { useAuth } from '../../hooks/useAuth';
import { spacing } from '../../theme/colors';
import type { ParentStackParamList } from '../../navigation/types';

// У родителя нет своих работ, поэтому профиль без сетки «Мои работы».
export function ParentProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  return (
    <Screen scroll>
      <ProfileHeader profile={profile} />
      <Button title="Редактировать профиль" variant="secondary" onPress={() => navigation.navigate('EditProfile')} />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Уведомления"
        variant="secondary"
        onPress={() => navigation.navigate('NotificationSettings')}
      />
      <View style={{ height: spacing.sm }} />
      <Button title="Выйти" variant="danger" onPress={signOut} />
    </Screen>
  );
}
