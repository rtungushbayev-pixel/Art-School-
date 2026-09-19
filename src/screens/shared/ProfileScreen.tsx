import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ProfileHeader } from '../../components/ProfileHeader';
import { fetchUserPosts } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { PostCardData } from '../../components/PostCard';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile, signOut } = useAuth();
  const [posts, setPosts] = useState<PostCardData[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setPosts(await fetchUserPosts(profile.id, profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;

  return (
    <Screen scroll>
      <ProfileHeader profile={profile} />

      <Button title="Редактировать профиль" variant="secondary" onPress={() => navigation.navigate('EditProfile')} />
      <View style={{ height: spacing.sm }} />
      <Button title="Выйти" variant="danger" onPress={signOut} />

      <Text style={styles.sectionTitle}>Мои работы</Text>
      <View style={styles.grid}>
        {posts.map((post) => (
          <Pressable
            key={post.id}
            style={styles.gridItem}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            {post.images[0] ? (
              <Image source={{ uri: post.images[0].image_url }} style={styles.gridImage} contentFit="cover" />
            ) : (
              <View style={[styles.gridImage, styles.gridPlaceholder]} />
            )}
            {post.status !== 'approved' ? (
              <View style={styles.statusOverlay}>
                <Text style={styles.statusText}>
                  {post.status === 'pending' ? 'На модерации' : 'Отклонено'}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      {posts.length === 0 ? <Text style={styles.empty}>Пока нет публикаций</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: { width: '32%', aspectRatio: 1, position: 'relative' },
  gridImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.border },
  gridPlaceholder: { backgroundColor: colors.border },
  statusOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingVertical: 2,
  },
  statusText: { color: colors.white, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
});
