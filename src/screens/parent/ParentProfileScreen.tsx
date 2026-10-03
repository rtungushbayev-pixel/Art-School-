import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { DeleteAccountButton } from '../../components/DeleteAccountButton';
import { ProfileHeader } from '../../components/ProfileHeader';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { changeProfileAvatar } from '../../lib/avatar';
import { colors, spacing } from '../../theme/colors';
import type { ParentStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    photoFailed: 'Не удалось загрузить фото',
    myChildren: 'Мои дети',
    editProfile: 'Редактировать профиль',
    notifications: 'Уведомления',
    language: 'Язык приложения',
    signOut: 'Выйти',
  },
  kk: {
    photoFailed: 'Фотосуретті жүктеу мүмкін болмады',
    myChildren: 'Менің балаларым',
    editProfile: 'Профильді өңдеу',
    notifications: 'Хабарландырулар',
    language: 'Қолданба тілі',
    signOut: 'Шығу',
  },
  en: {
    photoFailed: 'Could not upload the photo',
    myChildren: 'My children',
    editProfile: 'Edit profile',
    notifications: 'Notifications',
    language: 'App language',
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
      <Button title={s.editProfile} variant="secondary" onPress={() => navigation.navigate('EditProfile')} />
      <View style={{ height: spacing.sm }} />
      <Button
        title={s.notifications}
        variant="secondary"
        onPress={() => navigation.navigate('NotificationSettings')}
      />
      <Text style={styles.sectionLabel}>{s.language}</Text>
      <LanguageSwitcher />
      <View style={{ height: spacing.md }} />
      <Button title={s.signOut} variant="danger" onPress={signOut} />
      <DeleteAccountButton />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
