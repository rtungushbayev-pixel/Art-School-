import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchUserPosts } from '../lib/posts';
import { fetchAchievements, fetchStudentGroups } from '../lib/portfolio';
import type { PostCardData } from '../components/PostCard';
import type { Group, StudentAchievement } from '../types/database';

// Работы, достижения и группы пользователя для экрана профиля.
// Перезагружается при каждом возвращении на экран (после правок).
export function useStudentPortfolio(userId: string | undefined, viewerId: string | undefined) {
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [groups, setGroups] = useState<Pick<Group, 'id' | 'name'>[]>([]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const [postRows, achievementRows, groupRows] = await Promise.all([
      fetchUserPosts(userId, viewerId),
      fetchAchievements(userId),
      fetchStudentGroups(userId),
    ]);
    // Чужие неодобренные работы видит только сотрудник (для модерации);
    // в профиле показываем их только самому автору.
    setPosts(postRows.filter((p) => p.status === 'approved' || userId === viewerId));
    setAchievements(achievementRows);
    setGroups(groupRows);
  }, [userId, viewerId]);

  useFocusEffect(
    useCallback(() => {
      reload().catch(() => {});
    }, [reload])
  );

  return { posts, achievements, groups, reload };
}
