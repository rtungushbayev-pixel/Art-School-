import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AchievementList } from './AchievementList';
import { PortfolioGrid } from './PortfolioGrid';
import { ProfileStats } from './ProfileStats';
import { portfolioStats, sortPortfolio } from '../lib/portfolio';
import { colors, spacing } from '../theme/colors';
import type { PostCardData } from './PostCard';
import type { StudentAchievement } from '../types/database';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: {
    achievements: 'Достижения',
    add: '+ Добавить',
    addAchievementsHint: 'Добавьте конкурсы, выставки и награды',
    noAchievements: 'Пока нет достижений',
    myPortfolio: 'Моё портфолио',
    portfolio: 'Портфолио',
    allWorks: (count: number) => `Все работы (${count})`,
    noPosts: 'Пока нет публикаций',
  },
  kk: {
    achievements: 'Жетістіктер',
    add: '+ Қосу',
    addAchievementsHint: 'Байқаулар, көрмелер мен марапаттарды қосыңыз',
    noAchievements: 'Әзірге жетістіктер жоқ',
    myPortfolio: 'Менің портфолиом',
    portfolio: 'Портфолио',
    allWorks: (count: number) => `Барлық жұмыстар (${count})`,
    noPosts: 'Әзірге жарияланымдар жоқ',
  },
  en: {
    achievements: 'Achievements',
    add: '+ Add',
    addAchievementsHint: 'Add competitions, exhibitions and awards',
    noAchievements: 'No achievements yet',
    myPortfolio: 'My portfolio',
    portfolio: 'Portfolio',
    allWorks: (count: number) => `All artworks (${count})`,
    noPosts: 'No posts yet',
  },
};

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
  // Вкладки профиля: «Профиль» — цифры и достижения, «Публикации» — работы.
  show?: 'all' | 'profile' | 'posts';
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
  show = 'all',
}: PortfolioSectionsProps) {
  const s = useStrings(STRINGS);
  const showProfile = show !== 'posts';
  const showPosts = show !== 'profile';
  const sorted = sortPortfolio(posts);
  const preview = sorted.slice(0, PREVIEW_COUNT);

  return (
    <View>
      {showProfile ? (
        <ProfileStats stats={portfolioStats(posts, achievements)} showAchievements={isStudent} />
      ) : null}

      {showProfile && isStudent ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{s.achievements}</Text>
            {canEditAchievements ? (
              <Pressable onPress={onAddAchievement} hitSlop={8}>
                <Text style={styles.link}>{s.add}</Text>
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
              {isOwner ? s.addAchievementsHint : s.noAchievements}
            </Text>
          )}
        </>
      ) : null}

      {showPosts ? (
        <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{isOwner ? s.myPortfolio : s.portfolio}</Text>
        {posts.length > 0 ? (
          <Pressable onPress={onOpenPortfolio} hitSlop={8}>
            <Text style={styles.link}>{s.allWorks(posts.length)}</Text>
          </Pressable>
        ) : null}
      </View>
      <PortfolioGrid posts={preview} onPressPost={onOpenPost} showStatus={isOwner} />
      {posts.length === 0 ? <Text style={styles.empty}>{s.noPosts}</Text> : null}
        </>
      ) : null}
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
