import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { HeroFigure } from '../../components/HeroFigure';
import { HeroPath } from '../../components/HeroPath';
import { HeroWorksGallery } from '../../components/HeroWorksGallery';
import { XP_LESSON, XP_PER_STAR, XP_STREAK_12, XP_STREAK_4, XP_WEEKLY, xpStars, type HeroXp } from '../../lib/weeklyDrawing';
import { useAuth } from '../../hooks/useAuth';
import { useHero } from '../../hooks/useHero';
import { supabase } from '../../lib/supabase';
import { errorText } from '../../lib/errors';
import {
  HERO_SKINS,
  MAX_LEVEL,
  heroChapter,
  levelGroupName,
  saveHeroSkin,
  skinName,
  skinRarity,
  skinUnlockText,
  stageForLevel,
  stageName,
  type HeroSkin,
} from '../../lib/heroes';
import { useLanguage, useStrings } from '../../i18n';
import { portraitCaption } from '../../lib/contentI18n';
import { colors, radius, shadow, spacing } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Profile } from '../../types/database';
import type { StudentStackParamList } from '../../navigation/types';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

// Цвет плашки редкости скина.
const RARITY_COLOR: Record<HeroSkin, string> = {
  base: '#B9A27E',
  rare: '#2E8B57',
  epic: '#7B4FD6',
  legendary: '#D9A441',
};

const STRINGS = {
  ru: {
    level: (n: number) => `${n} уровень`,
    levelOf: (n: number, max: number) => `Уровень ${n} из ${max}`,
    lockedLevel: (group: string) => `Откроется: ${group}. Твой художник растёт, когда школа переводит тебя в следующую группу или на следующий курс.`,
    skins: 'Скины',
    skinsHint: 'Новые скины открываются за конкурсы и выставки школы.',
    wearing: 'Надето',
    wear: 'Надеть',
    saveFailed: 'Не удалось надеть скин',
    contests: 'Мои конкурсы',
    participations: 'участий',
    prizes: 'призовых мест',
    top: 'Гран-при и 1 мест',
    portraits: 'Настоящие автопортреты',
    portraitsHint: 'Так художник выглядел в разные годы. Картины — общественное достояние (Wikimedia Commons).',
    change: 'Сменить художника',
    notChosen: 'Художник ещё не выбран',
  },
  kk: {
    level: (n: number) => `${n}-деңгей`,
    levelOf: (n: number, max: number) => `${max} ішінен ${n}-деңгей`,
    lockedLevel: (group: string) => `Ашылады: ${group}. Мектеп сені келесі топқа немесе курсқа ауыстырғанда суретшің өседі.`,
    skins: 'Скиндер',
    skinsHint: 'Жаңа скиндер мектептің байқаулары мен көрмелері үшін ашылады.',
    wearing: 'Киілген',
    wear: 'Кию',
    saveFailed: 'Скинді кию мүмкін болмады',
    contests: 'Менің байқауларым',
    participations: 'қатысу',
    prizes: 'жүлделі орын',
    top: 'Гран-при және 1 орын',
    portraits: 'Нағыз автопортреттер',
    portraitsHint: 'Суретші әр жылдары осындай болған. Суреттер — қоғамдық игілік (Wikimedia Commons).',
    change: 'Суретшіні ауыстыру',
    notChosen: 'Суретші әлі таңдалмаған',
  },
  en: {
    level: (n: number) => `Level ${n}`,
    levelOf: (n: number, max: number) => `Level ${n} of ${max}`,
    lockedLevel: (group: string) => `Unlocks in: ${group}. Your artist grows when the school moves you to the next group or course.`,
    skins: 'Skins',
    skinsHint: 'New skins unlock for school competitions and exhibitions.',
    wearing: 'Wearing',
    wear: 'Wear',
    saveFailed: 'Could not change the skin',
    contests: 'My competitions',
    participations: 'entries',
    prizes: 'prizes',
    top: 'Grand Prix and 1st places',
    portraits: 'Real self-portraits',
    portraitsHint: 'How the artist looked over the years. The paintings are in the public domain (Wikimedia Commons).',
    change: 'Change artist',
    notChosen: 'No artist chosen yet',
  },
};

export function HeroScreen() {
  const route = useRoute<RouteProp<StudentStackParamList, 'Hero'>>();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { profile: me, refreshProfile } = useAuth();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const isOwner = route.params.userId === me?.id;
  const [other, setOther] = useState<Profile | null>(null);
  const [openPortrait, setOpenPortrait] = useState<number | null>(null);
  const [viewLevel, setViewLevel] = useState<number | null>(null);
  const [viewSkin, setViewSkin] = useState<HeroSkin | null>(null);
  const [saving, setSaving] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

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
  const { hero, level, progress, skin, unlocked, art, xp } = useHero(profile);

  // По умолчанию показываем текущий уровень и надетый скин.
  useEffect(() => {
    setViewLevel(null);
    setViewSkin(null);
  }, [level, skin]);

  if (!profile) return <Screen>{null}</Screen>;
  if (!hero) {
    return (
      <Screen>
        <Text style={styles.empty}>{s.notChosen}</Text>
        {isOwner ? <Button title={s.change} onPress={() => navigation.navigate('HeroPicker')} /> : null}
      </Screen>
    );
  }

  const shownLevel = viewLevel ?? level;
  const shownSkin = viewSkin ?? skin;
  const levelOpen = shownLevel <= level;

  const wear = async (next: HeroSkin) => {
    if (!me) return;
    setSaving(true);
    try {
      await saveHeroSkin(me.id, next);
      await refreshProfile();
    } catch (e) {
      Alert.alert(s.saveFailed, errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll scrollToTopSignal={scrollTop}>
      <Text style={styles.name}>{hero.name[lang] ?? hero.name.ru}</Text>
      <Text style={styles.years}>
        {hero.years} · {hero.tagline[lang] ?? hero.tagline.ru}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levels}>
        {LEVELS.map((l) => {
          const active = l === shownLevel;
          const locked = l > level;
          return (
            <Pressable
              key={l}
              onPress={() => setViewLevel(l)}
              style={[styles.levelChip, active && styles.levelChipActive, l === level && styles.levelChipCurrent]}
              accessibilityLabel={s.level(l)}
            >
              {locked && !active ? (
                <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
              ) : (
                <Text style={[styles.levelText, active && styles.levelTextActive]}>{l}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.figure, !levelOpen && styles.figureLocked]}>
        <HeroFigure hero={hero} level={shownLevel} skin={shownSkin} art={art} height={330} />
      </View>
      <Text style={styles.stage}>
        {stageName(stageForLevel(shownLevel), lang)} · {s.levelOf(level, MAX_LEVEL)}
      </Text>

      <Text style={styles.section}>{s.skins}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skins}>
        {HERO_SKINS.map((k) => {
          const open = unlocked.includes(k);
          const selected = k === shownSkin;
          const wearing = k === skin;
          return (
            <Pressable
              key={k}
              onPress={() => setViewSkin(k)}
              style={[styles.skinCard, selected && styles.skinCardSelected]}
            >
              <View style={[styles.rarity, { backgroundColor: RARITY_COLOR[k] }]}>
                <Text style={styles.rarityText}>{skinRarity(k, lang)}</Text>
              </View>
              <View style={!open && styles.skinLocked}>
                <HeroFigure hero={hero} level={shownLevel} skin={k} art={art} height={110} />
              </View>
              <Text style={styles.skinName} numberOfLines={2}>
                {skinName(k, lang)}
              </Text>
              {wearing ? (
                <Text style={styles.wearing}>{s.wearing}</Text>
              ) : open && isOwner ? (
                <Pressable
                  style={styles.wearButton}
                  onPress={() => wear(k)}
                  disabled={saving}
                  hitSlop={6}
                >
                  <Text style={styles.wearText}>{s.wear}</Text>
                </Pressable>
              ) : !open ? (
                <View style={styles.lockRow}>
                  <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                  <Text style={styles.lockText} numberOfLines={3}>
                    {skinUnlockText(k, lang)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.hint}>{s.skinsHint}</Text>

      <Text style={styles.section}>{s.level(shownLevel)}.</Text>
      <Text style={levelOpen ? styles.story : styles.lockedStory}>
        {levelOpen ? heroChapter(hero.id, shownLevel, lang) : s.lockedLevel(levelGroupName(shownLevel, lang))}
      </Text>

      <HeroPath
        hero={hero}
        level={level}
        skin={shownSkin}
        art={art}
        selected={shownLevel}
        onSelect={(l) => {
          // Показываем выбранный шаг наверху экрана: героя и его главу.
          setViewLevel(l);
          setScrollTop((n) => n + 1);
        }}
      />

      <XpPanel xp={xp} showLessons={isOwner || xp.attended > 0} />

      <View style={styles.contests}>
        <Text style={styles.contestsTitle}>{s.contests}</Text>
        <View style={styles.contestsRow}>
          <Stat value={progress.participations + progress.achievements} label={s.participations} />
          <Stat value={progress.prizes} label={s.prizes} />
          <Stat value={progress.top} label={s.top} />
        </View>
      </View>

      {hero.portraits?.length ? (
        <>
          <Text style={styles.section}>{s.portraits}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {hero.portraits.map((p, i) => (
              <Pressable key={i} style={styles.portrait} onPress={() => setOpenPortrait(i)}>
                <View style={styles.portraitFrame}>
                  <Image source={p.image} style={styles.portraitImage} contentFit="cover" contentPosition="top" />
                </View>
                <Text style={styles.portraitCaption} numberOfLines={3}>
                  {portraitCaption(p.caption, lang)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.hint}>{s.portraitsHint}</Text>
          <Modal visible={openPortrait !== null} transparent animationType="fade" onRequestClose={() => setOpenPortrait(null)}>
            <Pressable style={styles.viewer} onPress={() => setOpenPortrait(null)}>
              {openPortrait !== null ? (
                <>
                  <Image source={hero.portraits[openPortrait].image} style={styles.viewerImage} contentFit="contain" />
                  <Text style={styles.viewerCaption}>{portraitCaption(hero.portraits[openPortrait].caption, lang)}</Text>
                </>
              ) : null}
            </Pressable>
          </Modal>
        </>
      ) : null}

      <HeroWorksGallery heroId={hero.id} />

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

const XP_STRINGS = {
  ru: {
    title: 'Опыт художника',
    stars: (n: number) => `${n} ★`,
    toNext: (left: number) => `${left} опыта до следующей звезды`,
    daily: 'рисунков недели',
    lessons: 'занятий',
    streak: 'недель подряд',
    how: `Опыт: +${XP_WEEKLY} за рисунок недели, +${XP_LESSON} за каждое занятие, где ты был. Каждые ${XP_PER_STAR} опыта — звезда.`,
    badge7: `4 недели подряд · +${XP_STREAK_4}`,
    badge30: `12 недель подряд · +${XP_STREAK_12}`,
  },
  kk: {
    title: 'Суретші тәжірибесі',
    stars: (n: number) => `${n} ★`,
    toNext: (left: number) => `Келесі жұлдызға дейін ${left} тәжірибе`,
    daily: 'апта суреті',
    lessons: 'сабақ',
    streak: 'апта қатарынан',
    how: `Тәжірибе: апта суреті үшін +${XP_WEEKLY}, қатысқан әр сабақ үшін +${XP_LESSON}. Әр ${XP_PER_STAR} тәжірибе — бір жұлдыз.`,
    badge7: `4 апта қатарынан · +${XP_STREAK_4}`,
    badge30: `12 апта қатарынан · +${XP_STREAK_12}`,
  },
  en: {
    title: 'Artist XP',
    stars: (n: number) => `${n} ★`,
    toNext: (left: number) => `${left} XP to the next star`,
    daily: 'weekly drawings',
    lessons: 'lessons',
    streak: 'weeks in a row',
    how: `XP: +${XP_WEEKLY} for a drawing of the week, +${XP_LESSON} for every lesson you attend. Every ${XP_PER_STAR} XP is a star.`,
    badge7: `4 weeks in a row · +${XP_STREAK_4}`,
    badge30: `12 weeks in a row · +${XP_STREAK_12}`,
  },
};

// Опыт героя: звёзды, огонёк серии, рисунки дня и посещения.
function XpPanel({ xp, showLessons }: { xp: HeroXp; showLessons: boolean }) {
  const s = useStrings(XP_STRINGS);
  const { stars, into } = xpStars(xp.xp);
  return (
    <View style={styles.xp}>
      <View style={styles.xpHead}>
        <Text style={styles.xpTitle}>{s.title}</Text>
        <Text style={styles.xpStars}>{s.stars(stars)}</Text>
      </View>
      <View style={styles.xpBar}>
        <View style={[styles.xpFill, { width: `${(into / XP_PER_STAR) * 100}%` }]} />
      </View>
      <Text style={styles.xpMeta}>
        {xp.xp} XP · {s.toNext(XP_PER_STAR - into)}
      </Text>
      <View style={styles.contestsRow}>
        <Stat value={xp.weeks} label={s.daily} />
        {/* Посещаемость видят только ученик, родители и сотрудники (0062). */}
        {showLessons ? <Stat value={xp.attended} label={s.lessons} /> : null}
        <Stat value={xp.streak} label={s.streak} />
      </View>
      <View style={styles.badges}>
        {[
          [4, s.badge7],
          [12, s.badge30],
        ].map(([n, label]) => {
          const got = xp.bestStreak >= (n as number);
          return (
            <View key={n as number} style={[styles.badge, !got && styles.badgeOff]}>
              <Ionicons name={got ? 'flame' : 'lock-closed'} size={14} color={got ? '#FF7A1A' : '#8E86B5'} />
              <Text style={[styles.badgeText, !got && styles.badgeTextOff]}>{label as string}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.xpHow}>{s.how}</Text>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.textMuted, marginVertical: spacing.lg },
  name: { fontFamily: fonts.hand, fontSize: 38, lineHeight: 44, color: colors.text, textAlign: 'center' },
  years: { fontFamily: fonts.round, color: colors.textMuted, textAlign: 'center', marginTop: 2, paddingHorizontal: spacing.md },
  levels: { gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: 2 },
  levelChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChipCurrent: { borderWidth: 2, borderColor: colors.accent },
  levelChipActive: { backgroundColor: colors.surface, ...shadow.card },
  levelText: { fontSize: 16, fontWeight: '600', color: colors.text },
  levelTextActive: { color: colors.primary, fontWeight: '800' },
  figure: { alignItems: 'center', minHeight: 330 },
  figureLocked: { opacity: 0.35 },
  stage: { fontFamily: fonts.roundBold, textAlign: 'center', color: colors.primary, marginTop: spacing.sm },
  section: { fontFamily: fonts.hand, fontSize: 32, lineHeight: 38, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  skins: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs, paddingHorizontal: 2 },
  skinCard: {
    width: 132,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  skinCardSelected: { borderColor: '#A98BE8', backgroundColor: '#F3EEFC' },
  rarity: { position: 'absolute', top: -10, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  rarityText: { color: colors.white, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  skinLocked: { opacity: 0.35 },
  skinName: { fontFamily: fonts.hand, fontSize: 20, color: colors.text, textAlign: 'center', marginTop: 4 },
  wearing: { color: '#7B4FD6', fontWeight: '800', marginTop: 4 },
  wearButton: {
    marginTop: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  wearText: { color: colors.primary, fontWeight: '700' },
  lockRow: { flexDirection: 'row', gap: 3, marginTop: 4, alignItems: 'flex-start' },
  lockText: { flex: 1, fontSize: 10, color: colors.textMuted },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  story: { fontSize: 17, lineHeight: 25, color: colors.text },
  lockedStory: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  xp: { marginTop: spacing.lg, backgroundColor: '#4A2F91', borderRadius: radius.lg, padding: spacing.md },
  xpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xpTitle: { fontFamily: fonts.hand, color: colors.white, fontSize: 26 },
  xpStars: { color: '#FBB31F', fontSize: 20, fontWeight: '800' },
  xpBar: { height: 8, borderRadius: 4, backgroundColor: '#6B55B0', marginTop: spacing.xs, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4, backgroundColor: '#FBB31F' },
  xpMeta: { color: '#E3DAF7', fontSize: 12, marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1E0',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeOff: { backgroundColor: '#5E46A3' },
  badgeText: { color: '#C2410C', fontWeight: '700', fontSize: 12 },
  badgeTextOff: { color: '#D6CCF0' },
  xpHow: { color: '#D6CCF0', fontSize: 11, marginTop: spacing.sm },
  contests: {
    marginTop: spacing.lg,
    backgroundColor: '#1F2150',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  contestsTitle: { fontFamily: fonts.hand, color: colors.white, fontSize: 26 },
  contestsRow: { flexDirection: 'row', marginTop: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#6FE3FF', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#C9CBEF', fontSize: 11, textAlign: 'center' },
  gallery: { gap: spacing.sm, paddingBottom: spacing.xs },
  portrait: { width: 132 },
  portraitFrame: { backgroundColor: colors.accent, padding: 4, borderRadius: radius.md, ...shadow.soft },
  portraitImage: { width: 124, height: 155, borderRadius: radius.sm },
  portraitCaption: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  viewerImage: { width: '100%', height: '75%' },
  viewerCaption: { color: colors.white, marginTop: spacing.md, textAlign: 'center' },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  changeText: { color: colors.primary, fontWeight: '700' },
});
