import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { CommunityComposer } from '../../components/CommunityComposer';
import { useAuth } from '../../hooks/useAuth';

// Новая публикация в Комьюнити: открывается кнопкой «+» в ленте.
export function NewCommunityPostScreen() {
  const navigation = useNavigation();
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <Screen scroll>
      <CommunityComposer authorId={profile.id} onPublished={() => navigation.goBack()} />
    </Screen>
  );
}
