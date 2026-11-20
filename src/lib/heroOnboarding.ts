import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Profile } from '../types/database';
import type { StudentStackParamList } from '../navigation/types';

// Выбор героя при первом входе ученика. «Выберу позже» запоминается на
// телефоне, и окно больше не открывается само (герой выбирается в профиле).
const key = (userId: string) => `hero_onboarding_dismissed_${userId}`;

export function dismissHeroOnboarding(userId: string) {
  AsyncStorage.setItem(key(userId), '1').catch(() => {});
}

export function useHeroOnboarding(profile: Profile | null) {
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const userId = profile?.role === 'student' && !profile.hero_id ? profile.id : null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    AsyncStorage.getItem(key(userId))
      .then((dismissed) => {
        if (!cancelled && !dismissed) {
          // Отмечаем сразу: окно показывается один раз, даже если его просто закрыть.
          dismissHeroOnboarding(userId);
          navigation.navigate('HeroPicker', { onboarding: true });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, navigation]);
}
