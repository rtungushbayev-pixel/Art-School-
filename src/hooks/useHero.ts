import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchStudentGroups } from '../lib/portfolio';
import {
  EMPTY_PROGRESS,
  HERO_SKINS,
  fetchHeroProgress,
  findHero,
  heroArtFiles,
  heroLevel,
  skinUnlocked,
  stageForLevel,
  type Hero,
  type HeroProgress,
  type HeroSkin,
} from '../lib/heroes';
import type { HeroStage } from '../lib/heroArt';
import { EMPTY_XP, fetchHeroXp, type HeroXp } from '../lib/weeklyDrawing';
import type { Group, Profile } from '../types/database';

export interface HeroState {
  hero: Hero | null;
  level: number;
  stage: HeroStage;
  progress: HeroProgress;
  // Надетый скин (если он ещё не открыт — обычный).
  skin: HeroSkin;
  unlocked: HeroSkin[];
  // Загруженные картинки в полный рост: ключ «{уровень}_{скин}» → адрес.
  art: Map<string, string>;
  // Опыт: рисунок недели, огонёк серии, посещения (0060).
  xp: HeroXp;
}

// Герой ученика: уровень по группам, скины за конкурсы. Если группы уже
// загружены экраном (профиль), передайте их, чтобы не грузить второй раз.
export function useHero(
  profile: Pick<Profile, 'id' | 'role' | 'hero_id' | 'hero_skin' | 'study_since'> | null | undefined,
  knownGroups?: Pick<Group, 'name' | 'course'>[]
): HeroState & { reload: () => void } {
  const [groups, setGroups] = useState<Pick<Group, 'name' | 'course'>[]>(knownGroups ?? []);
  const [progress, setProgress] = useState<HeroProgress>(EMPTY_PROGRESS);
  const [art, setArt] = useState<Map<string, string>>(new Map());
  const [xp, setXp] = useState<HeroXp>(EMPTY_XP);
  const studentId = profile?.role === 'student' ? profile.id : null;
  const hero = findHero(profile?.hero_id);

  useEffect(() => {
    if (knownGroups) setGroups(knownGroups);
  }, [knownGroups]);

  useEffect(() => {
    if (!hero) return;
    let cancelled = false;
    heroArtFiles(hero.id).then((files) => {
      if (!cancelled) setArt(files);
    });
    return () => {
      cancelled = true;
    };
  }, [hero]);

  const reload = useCallback(() => {
    if (!studentId) return;
    fetchHeroProgress(studentId)
      .then(setProgress)
      .catch(() => setProgress(EMPTY_PROGRESS));
    fetchHeroXp(studentId)
      .then(setXp)
      .catch(() => setXp(EMPTY_XP));
    if (!knownGroups) {
      fetchStudentGroups(studentId)
        .then(setGroups)
        .catch(() => {});
    }
  }, [studentId, knownGroups]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const level = heroLevel(groups, profile?.study_since);
  const unlocked = HERO_SKINS.filter((s) => skinUnlocked(s, progress));
  const wanted = (profile?.hero_skin ?? 'base') as HeroSkin;
  return {
    hero,
    level,
    stage: stageForLevel(level),
    progress,
    skin: unlocked.includes(wanted) ? wanted : 'base',
    unlocked,
    art,
    xp,
    reload,
  };
}
