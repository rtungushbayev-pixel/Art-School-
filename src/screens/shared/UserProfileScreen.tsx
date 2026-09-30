import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ProfileHeader } from '../../components/ProfileHeader';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { fetchUserPosts } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { Profile, UserRole } from '../../types/database';
import type { PostCardData } from '../../components/PostCard';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'UserProfile'>>();
  const { profile: viewer } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [changingRole, setChangingRole] = useState(false);

  const userId = route.params.userId;

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data as Profile);
    setPosts(await fetchUserPosts(userId, viewer?.id));
  }, [userId, viewer?.id]);

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

  const visiblePosts = posts.filter((p) => p.status === 'approved' || p.author?.id === viewer?.id);

  if (!profile) {
    return (
      <Screen>
        <Text style={styles.empty}>Загрузка…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ProfileHeader profile={profile} />
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
      <Text style={styles.sectionTitle}>Работы</Text>
      <View style={styles.grid}>
        {visiblePosts.map((post) => (
          <Pressable
            key={post.id}
            style={styles.gridItem}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            {post.images[0] ? (
              <Image source={{ uri: post.images[0].image_url }} style={styles.gridImage} contentFit="cover" />
            ) : (
              <View style={styles.gridImage} />
            )}
          </Pressable>
        ))}
      </View>
      {visiblePosts.length === 0 ? <Text style={styles.empty}>Пока нет публикаций</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  roleAction: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: { width: '32%', aspectRatio: 1 },
  gridImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.border },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
