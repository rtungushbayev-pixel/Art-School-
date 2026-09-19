import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ProfileHeader } from '../../components/ProfileHeader';
import { supabase } from '../../lib/supabase';
import { fetchUserPosts } from '../../lib/posts';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { PostCardData } from '../../components/PostCard';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'UserProfile'>>();
  const { profile: viewer } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostCardData[]>([]);

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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: { width: '32%', aspectRatio: 1 },
  gridImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.border },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
