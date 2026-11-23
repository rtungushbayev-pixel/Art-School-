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
import { colors, radius, shadow, spacing } from '../../theme/colors';
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
    lockedLevel: (group: string) => `Откроется: ${group}. Герой растёт, когда школа переводит тебя в следующую группу или на следующий курс.`,
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
    change: 'Сменить героя',
    notChosen: 'Герой ещё не выбран',
  },
  kk: {
    level: (n: number) => `${n}-деңгей`,
    levelOf: (n: number, max: number) => `${max} ішінен ${n}-деңгей`,
    lockedLevel: (group: string) => `Ашылады: ${group}. Мектеп сені келесі топқа немесе курсқа ауыстырғанда кейіпкер өседі.`,
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
    change: 'Кейіпкерді ауыстыру',
    notChosen: 'Кейіпкер әлі таңдалмаған',
  },
  en: {
    level: (n: number) => `Level ${n}`,
    levelOf: (n: number, max: number) => `Level ${n} of ${max}`,
    lockedLevel: (group: string) => `Unlocks in: ${group}. Your hero grows when the school moves you to the next group or course.`,
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
    change: 'Change hero',
    notChosen: 'No hero chosen yet',
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
  const { hero, level, progress, skin, unlocked, art } = useHero(profile);

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
        {levelOpen ? heroChapter(hero.id, shownLevel) : s.lockedLevel(levelGroupName(shownLevel, lang))}
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
                  {p.caption}
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
                  <Text style={styles.viewerCaption}>{hero.portraits[openPortrait].caption}</Text>
                </>
              ) : null}
            </Pressable>
          </Modal>
        </>
      ) : null}

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
  name: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  years: { color: colors.textMuted, textAlign: 'center', marginTop: 2, paddingHorizontal: spacing.md },
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
  stage: { textAlign: 'center', color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
  section: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
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
  skinName: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 4 },
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
  contests: {
    marginTop: spacing.lg,
    backgroundColor: '#1F2150',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  contestsTitle: { color: colors.white, fontWeight: '800', fontSize: 16 },
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
