import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { DeleteAccountButton } from '../../components/DeleteAccountButton';
import { ProfileHeader } from '../../components/ProfileHeader';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { changeProfileAvatar } from '../../lib/avatar';
import { spacing } from '../../theme/colors';
import type { ParentStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    profileSettings: 'Настройки профиля',
    chats: 'Чаты с преподавателями',
    photoFailed: 'Не удалось загрузить фото',
    myChildren: 'Мои дети',
    signOut: 'Выйти',
  },
  kk: {
    profileSettings: 'Профиль баптаулары',
    chats: 'Мұғалімдермен чаттар',
    photoFailed: 'Фотосуретті жүктеу мүмкін болмады',
    myChildren: 'Менің балаларым',
    signOut: 'Шығу',
  },
  en: {
    profileSettings: 'Profile settings',
    chats: 'Chats with teachers',
    photoFailed: 'Could not upload the photo',
    myChildren: 'My children',
    signOut: 'Sign out',
  },
};

// У родителя нет своих работ, поэтому профиль без сетки «Мои работы».
export function ParentProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const { profile, signOut, refreshProfile } = useAuth();
  const s = useStrings(STRINGS);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const onAvatarPress = async () => {
    if (!profile) return;
    setAvatarUploading(true);
    try {
      if (await changeProfileAvatar(profile.id)) await refreshProfile();
    } catch (e) {
      Alert.alert(s.photoFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!profile) return null;

  return (
    <Screen scroll>
      <ProfileHeader profile={profile} onAvatarPress={onAvatarPress} avatarUploading={avatarUploading} />
      <Button title={s.myChildren} onPress={() => navigation.navigate('Children')} />
      <View style={{ height: spacing.sm }} />
      <Button title={s.chats} variant="secondary" onPress={() => navigation.navigate('Chats')} />
      <View style={{ height: spacing.sm }} />
      <Button
        title={s.profileSettings}
        variant="secondary"
        onPress={() => navigation.navigate('ProfileSettings')}
      />
      <View style={{ height: spacing.md }} />
      <Button title={s.signOut} variant="danger" onPress={signOut} />
      <DeleteAccountButton />
    </Screen>
  );
}

