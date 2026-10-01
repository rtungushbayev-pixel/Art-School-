import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AchievementList } from './AchievementList';
import { PortfolioGrid } from './PortfolioGrid';
import { ProfileStats } from './ProfileStats';
import { portfolioStats, sortPortfolio } from '../lib/portfolio';
import { colors, spacing } from '../theme/colors';
import type { PostCardData } from './PostCard';
import type { StudentAchievement } from '../types/database';

// Сколько работ показывать в профиле; остальные — на экране «Портфолио»
const PREVIEW_COUNT = 9;

interface PortfolioSectionsProps {
  posts: PostCardData[];
  achievements: StudentAchievement[];
  isStudent: boolean;
  isOwner: boolean;
  // Добавлять и править достижения может сам ученик и сотрудник
  canEditAchievements: boolean;
  onOpenPost: (postId: string) => void;
  onOpenPortfolio: () => void;
  onAddAchievement: () => void;
  onEditAchievement: (achievement: StudentAchievement) => void;
}

export function PortfolioSections({
  posts,
  achievements,
  isStudent,
  isOwner,
  canEditAchievements,
  onOpenPost,
  onOpenPortfolio,
  onAddAchievement,
  onEditAchievement,
}: PortfolioSectionsProps) {
  const sorted = sortPortfolio(posts);
  const preview = sorted.slice(0, PREVIEW_COUNT);

  return (
    <View>
      <ProfileStats stats={portfolioStats(posts, achievements)} showAchievements={isStudent} />

      {isStudent ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Достижения</Text>
            {canEditAchievements ? (
              <Pressable onPress={onAddAchievement} hitSlop={8}>
                <Text style={styles.link}>+ Добавить</Text>
              </Pressable>
            ) : null}
          </View>
          {achievements.length > 0 ? (
            <AchievementList
              achievements={achievements}
              onPress={canEditAchievements ? onEditAchievement : undefined}
            />
          ) : (
            <Text style={styles.empty}>
              {isOwner ? 'Добавьте конкурсы, выставки и награды' : 'Пока нет достижений'}
            </Text>
          )}
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{isOwner ? 'Моё портфолио' : 'Портфолио'}</Text>
        {posts.length > 0 ? (
          <Pressable onPress={onOpenPortfolio} hitSlop={8}>
            <Text style={styles.link}>Все работы ({posts.length})</Text>
          </Pressable>
        ) : null}
      </View>
      <PortfolioGrid posts={preview} onPressPost={onOpenPost} showStatus={isOwner} />
      {posts.length === 0 ? <Text style={styles.empty}>Пока нет публикаций</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  link: { color: colors.primary, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
});
