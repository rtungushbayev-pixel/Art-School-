import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HeroAvatar } from './HeroAvatar';
import { HeroFigure } from './HeroFigure';
import { HEROES, MAX_LEVEL, skinName, stageName } from '../lib/heroes';
import { xpStars } from '../lib/dailyDrawing';
import type { HeroState } from '../hooks/useHero';
import { useLanguage, useStrings } from '../i18n';
import { colors, radius, shadow, spacing } from '../theme/colors';

const STRINGS = {
  ru: {
    myHero: 'Мой герой',
    hero: 'Герой',
    level: (n: number, max: number) => `Уровень ${n} из ${max}`,
    chooseTitle: 'Выбери своего героя',
    chooseText: 'Великий художник будет расти вместе с тобой: от группы к группе и с каждым конкурсом.',
  },
  kk: {
    myHero: 'Менің кейіпкерім',
    hero: 'Кейіпкер',
    level: (n: number, max: number) => `${max} ішінен ${n}-деңгей`,
    chooseTitle: 'Өз кейіпкеріңді таңда',
    chooseText: 'Ұлы суретші сенімен бірге өседі: топтан топқа және әр байқау сайын.',
  },
  en: {
    myHero: 'My hero',
    hero: 'Hero',
    level: (n: number, max: number) => `Level ${n} of ${max}`,
    chooseTitle: 'Choose your hero',
    chooseText: 'A great artist will grow with you: from group to group and with every competition.',
  },
};

interface HeroCardProps {
  state: HeroState;
  isOwner?: boolean;
  onOpen: () => void;
  onChoose?: () => void;
}

// Карточка героя в профиле ученика. Пустая — только у самого ученика:
// приглашение выбрать героя.
export function HeroCard({ state, isOwner, onOpen, onChoose }: HeroCardProps) {
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const { hero, level, stage, skin, art, xp } = state;

  if (!hero) {
    if (!isOwner || !onChoose) return null;
    return (
      <Pressable onPress={onChoose} style={[styles.card, styles.empty]}>
        <View style={styles.previewRow}>
          {HEROES.slice(0, 3).map((h, i) => (
            <View key={h.id} style={[styles.preview, i > 0 && styles.previewOverlap]}>
              <HeroAvatar hero={h} stage={stage} size={52} />
            </View>
          ))}
        </View>
        <View style={styles.info}>
          <Text style={styles.chooseTitle}>{s.chooseTitle}</Text>
          <Text style={styles.chooseText}>{s.chooseText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onOpen} style={styles.card}>
      {art.get(`${level}_${skin}`) ? (
        // Герой в полный рост и крупно (без уменьшения по уровню), чтобы его было хорошо видно.
        <View style={styles.portrait}>
          <Image
            source={{ uri: art.get(`${level}_${skin}`) }}
            style={styles.portraitImage}
            contentFit="contain"
            transition={200}
            accessibilityLabel={hero.name.ru}
          />
        </View>
      ) : (
        <HeroFigure hero={hero} level={level} skin={skin} art={art} height={110} />
      )}
      <View style={styles.info}>
        <Text style={styles.kicker}>{isOwner ? s.myHero : s.hero}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {hero.name[lang] ?? hero.name.ru}
        </Text>
        <Text style={styles.stage}>{stageName(stage, lang)}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${(level / MAX_LEVEL) * 100}%` }]} />
        </View>
        <Text style={styles.meta}>{s.level(level, MAX_LEVEL)}</Text>
        {xp.xp > 0 || xp.streak > 0 ? (
          <View style={styles.xpRow}>
            <Text style={styles.xpStar}>★ {xpStars(xp.xp).stars}</Text>
            <Text style={styles.xpText}>{xp.xp} XP</Text>
            {xp.streak > 0 ? (
              <View style={styles.flame}>
                <Ionicons name="flame" size={13} color="#FF7A1A" />
                <Text style={styles.flameText}>{xp.streak}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {skin !== 'base' ? (
          <View style={styles.powerPill}>
            <Ionicons name="sparkles" size={12} color={colors.white} />
            <Text style={styles.powerText}>{skinName(skin, lang)}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  empty: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.primary },
  previewRow: { flexDirection: 'row' },
  preview: { borderRadius: 26, backgroundColor: colors.surface },
  previewOverlap: { marginLeft: -18 },
  portrait: { width: 132, height: 176, alignItems: 'center', justifyContent: 'flex-end' },
  portraitImage: { width: 132, height: 176 },
  info: { flex: 1 },
  kicker: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
  name: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 1 },
  stage: { color: colors.primary, fontWeight: '700', marginTop: 1 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginTop: spacing.sm, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  xpStar: { color: '#D9A441', fontWeight: '800', fontSize: 13 },
  xpText: { color: colors.textMuted, fontSize: 12 },
  flame: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  flameText: { color: '#C2410C', fontWeight: '800', fontSize: 12 },
  powerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: '#2B2D6E',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  powerText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  chooseTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },
  chooseText: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
