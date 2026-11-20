import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchStudentGroups } from '../lib/portfolio';
import { fetchHeroPoints, findHero, heroLevel, powerForPoints, stageForLevel, type Hero } from '../lib/heroes';
import type { HeroPower, HeroStage } from '../lib/heroArt';
import type { Group, Profile } from '../types/database';

export interface HeroState {
  hero: Hero | null;
  level: number;
  stage: HeroStage;
  points: number;
  power: HeroPower;
}

// Герой ученика: стадия по группам, сила по конкурсам. Если группы уже
// загружены экраном (профиль), передайте их, чтобы не грузить второй раз.
export function useHero(
  profile: Pick<Profile, 'id' | 'role' | 'hero_id' | 'study_since'> | null | undefined,
  knownGroups?: Pick<Group, 'name' | 'course'>[]
): HeroState & { reload: () => void } {
  const [groups, setGroups] = useState<Pick<Group, 'name' | 'course'>[]>(knownGroups ?? []);
  const [points, setPoints] = useState(0);
  const studentId = profile?.role === 'student' ? profile.id : null;

  useEffect(() => {
    if (knownGroups) setGroups(knownGroups);
  }, [knownGroups]);

  const reload = useCallback(() => {
    if (!studentId) return;
    fetchHeroPoints(studentId)
      .then(setPoints)
      .catch(() => setPoints(0));
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
  return {
    hero: findHero(profile?.hero_id),
    level,
    stage: stageForLevel(level),
    points,
    power: powerForPoints(points),
    reload,
  };
}
