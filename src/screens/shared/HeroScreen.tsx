import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { HeroAvatar } from '../../components/HeroAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useHero } from '../../hooks/useHero';
import { supabase } from '../../lib/supabase';
import {
  MAX_LEVEL,
  POWER_THRESHOLDS,
  powerName,
  stageName,
  stageUnlockText,
} from '../../lib/heroes';
import type { HeroPower, HeroStage } from '../../lib/heroArt';
import { useLanguage, useStrings } from '../../i18n';
import { colors, radius, shadow, spacing } from '../../theme/colors';
import type { Profile } from '../../types/database';
import type { StudentStackParamList } from '../../navigation/types';

const STAGES: HeroStage[] = [1, 2, 3, 4, 5];
const POWERS: Exclude<HeroPower, 0>[] = [1, 2, 3, 4];

const STRINGS = {
  ru: {
    level: (n: number, max: number) => `Уровень ${n} из ${max}`,
    levelHint: 'Герой взрослеет, когда школа переводит тебя в следующую группу или на следующий курс.',
    growth: 'Путь героя',
    power: 'Сила за конкурсы',
    powerHint:
      'Участвуй в конкурсах и выставках школы, и твой герой станет сильнее. 1 очко — за участие в прошедшем конкурсе или выставке, 2 очка — за достижение, которое подтвердила школа.',
    points: (n: number) => `Очков силы: ${n}`,
    toNext: (n: number, name: string) => `Ещё ${n} — и откроется «${name}»`,
    maxPower: 'Открыта вся сила. Ты — магистр искусств!',
    pointsNeeded: (n: number) => `от ${n} очк.`,
    story: 'История героя',
    locked: (when: string) => `Глава откроется ${when}`,
    change: 'Сменить героя',
    notChosen: 'Герой ещё не выбран',
  },
  kk: {
    level: (n: number, max: number) => `${max} ішінен ${n}-деңгей`,
    levelHint: 'Мектеп сені келесі топқа немесе курсқа ауыстырғанда кейіпкер есейеді.',
    growth: 'Кейіпкердің жолы',
    power: 'Байқаулар үшін күш',
    powerHint:
      'Мектептің байқаулары мен көрмелеріне қатыс — кейіпкерің күшейеді. Өткен байқауға не көрмеге қатысу — 1 ұпай, мектеп растаған жетістік — 2 ұпай.',
    points: (n: number) => `Күш ұпайлары: ${n}`,
    toNext: (n: number, name: string) => `Тағы ${n} — және «${name}» ашылады`,
    maxPower: 'Барлық күш ашылды. Сен — өнер магистрісің!',
    pointsNeeded: (n: number) => `${n} ұпайдан`,
    story: 'Кейіпкердің тарихы',
    locked: (when: string) => `Тарау ашылады: ${when}`,
    change: 'Кейіпкерді ауыстыру',
    notChosen: 'Кейіпкер әлі таңдалмаған',
  },
  en: {
    level: (n: number, max: number) => `Level ${n} of ${max}`,
    levelHint: 'Your hero grows up when the school moves you to the next group or course.',
    growth: "Hero's path",
    power: 'Power from competitions',
    powerHint:
      'Take part in school competitions and exhibitions and your hero gets stronger. 1 point for taking part in a past competition or exhibition, 2 points for an achievement confirmed by the school.',
    points: (n: number) => `Power points: ${n}`,
    toNext: (n: number, name: string) => `${n} more to unlock “${name}”`,
    maxPower: 'All power unlocked. You are a master of arts!',
    pointsNeeded: (n: number) => `${n}+ pts`,
    story: "Hero's story",
    locked: (when: string) => `This chapter unlocks ${when}`,
    change: 'Change hero',
    notChosen: 'No hero chosen yet',
  },
};

export function HeroScreen() {
  const route = useRoute<RouteProp<StudentStackParamList, 'Hero'>>();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { profile: me } = useAuth();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const isOwner = route.params.userId === me?.id;
  const [other, setOther] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (isOwner) return;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', route.params.userId)
        .single()
        .then(({ data }) => setOther((data as Profile) ?? null));
    }, [isOwner, route.params.userId])
  );

  const profile = isOwner ? me : other;
  const { hero, level, stage, points, power } = useHero(profile);

  if (!profile) return <Screen>{null}</Screen>;
  if (!hero) {
    return (
      <Screen>
        <Text style={styles.empty}>{s.notChosen}</Text>
        {isOwner ? <Button title={s.change} onPress={() => navigation.navigate('HeroPicker')} /> : null}
      </Screen>
    );
  }

  const nextPower = POWERS.find((p) => points < POWER_THRESHOLDS[p]);

  return (
    <Screen scroll>
      <View style={styles.head}>
        <HeroAvatar hero={hero} stage={stage} power={power} size={230} />
        <Text style={styles.name}>{hero.name[lang] ?? hero.name.ru}</Text>
        <Text style={styles.years}>{hero.years}</Text>
        <Text style={styles.tagline}>{hero.tagline[lang] ?? hero.tagline.ru}</Text>
        <View style={styles.stagePill}>
          <Text style={styles.stagePillText}>{stageName(stage, lang)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{s.growth}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${(level / MAX_LEVEL) * 100}%` }]} />
        </View>
        <Text style={styles.meta}>{s.level(level, MAX_LEVEL)}</Text>
        <View style={styles.stages}>
          {STAGES.map((st) => (
            <View key={st} style={[styles.stageItem, st > stage && styles.dim]}>
              <HeroAvatar hero={hero} stage={st} size={56} />
              <Text style={[styles.stageLabel, st === stage && styles.stageLabelActive]} numberOfLines={2}>
                {stageName(st, lang)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.hint}>{s.levelHint}</Text>
      </View>

      <View style={[styles.card, styles.powerCard]}>
        <Text style={[styles.cardTitle, styles.powerTitle]}>{s.power}</Text>
        <Text style={styles.powerPoints}>{s.points(points)}</Text>
        <View style={styles.stages}>
          {POWERS.map((p) => (
            <View key={p} style={[styles.stageItem, p > power && styles.dim]}>
              <HeroAvatar hero={hero} stage={stage} power={p} size={64} />
              <Text style={styles.powerLabel} numberOfLines={2}>
                {powerName(p, lang)}
              </Text>
              <Text style={styles.powerNeed}>{s.pointsNeeded(POWER_THRESHOLDS[p])}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.powerNext}>
          {nextPower ? s.toNext(POWER_THRESHOLDS[nextPower] - points, powerName(nextPower, lang)) : s.maxPower}
        </Text>
        <Text style={styles.powerHint}>{s.powerHint}</Text>
      </View>

      <Text style={styles.section}>{s.story}</Text>
      {hero.chapters.map((text, i) => {
        const st = (i + 1) as HeroStage;
        const open = st <= stage;
        return (
          <View key={st} style={[styles.chapter, !open && styles.chapterLocked]}>
            <View style={styles.chapterHead}>
              <Ionicons
                name={open ? 'book' : 'lock-closed'}
                size={16}
                color={open ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.chapterTitle, !open && styles.lockedText]}>
                {st}. {stageName(st, lang)}
              </Text>
            </View>
            <Text style={open ? styles.chapterText : styles.lockedText}>
              {open ? text : s.locked(stageUnlockText(st, lang))}
            </Text>
          </View>
        );
      })}

      {isOwner ? (
        <Pressable style={styles.change} onPress={() => navigation.navigate('HeroPicker')}>
          <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
          <Text style={styles.changeText}>{s.change}</Text>
        </Pressable>
      ) : null}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.textMuted, marginVertical: spacing.lg },
  head: { alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  years: { color: colors.textMuted, marginTop: 2 },
  tagline: { color: colors.text, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  stagePill: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  stagePillText: { color: colors.white, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, marginTop: spacing.sm, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  stages: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  stageItem: { alignItems: 'center', flex: 1 },
  dim: { opacity: 0.35 },
  stageLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  stageLabelActive: { color: colors.primary, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.md },
  powerCard: { backgroundColor: '#1F2150', borderColor: '#2B2D6E' },
  powerTitle: { color: colors.white },
  powerPoints: { color: '#6FE3FF', fontWeight: '700', marginTop: 4 },
  powerLabel: { fontSize: 10, color: colors.white, textAlign: 'center', marginTop: 4, fontWeight: '700' },
  powerNeed: { fontSize: 10, color: '#B9BEE8', textAlign: 'center' },
  powerNext: { color: '#E8C25A', fontWeight: '700', marginTop: spacing.md },
  powerHint: { color: '#C9CBEF', fontSize: 13, marginTop: spacing.xs },
  section: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  chapter: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chapterLocked: { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.border },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  chapterTitle: { fontWeight: '800', color: colors.primary },
  chapterText: { color: colors.text, lineHeight: 21 },
  lockedText: { color: colors.textMuted },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  changeText: { color: colors.primary, fontWeight: '700' },
});
