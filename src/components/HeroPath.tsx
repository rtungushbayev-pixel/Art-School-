import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeroFigure } from './HeroFigure';
import { LEVEL_AGE, MAX_LEVEL, levelGroupName, type Hero, type HeroSkin } from '../lib/heroes';
import { useLanguage, useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';

interface Props {
  hero: Hero;
  level: number; // где ученик сейчас
  skin: HeroSkin;
  art: Map<string, string>;
  selected: number; // какой образ открыт на экране
  onSelect: (level: number) => void;
}

const STRINGS = {
  ru: {
    title: 'Дорога мастера',
    hint: 'Весь путь в школе: от первой группы до Арт-карьеры. Нажми на шаг, чтобы увидеть героя.',
    here: 'Ты здесь',
    done: 'Пройдено',
    age: (n: number) => `герой ${n} лет`,
    finish: 'Дальше — университет, профессия и свои выставки.',
  },
  kk: {
    title: 'Шебер жолы',
    hint: 'Мектептегі бүкіл жол: алғашқы топтан Арт-мансапқа дейін. Кейіпкерді көру үшін қадамды бас.',
    here: 'Сен осындасың',
    done: 'Өтілді',
    age: (n: number) => `кейіпкер ${n} жаста`,
    finish: 'Әрі қарай — университет, мамандық және өз көрмелерің.',
  },
  en: {
    title: 'The master’s road',
    hint: 'Your whole path at school, from the first group to Art Career. Tap a step to see your hero.',
    here: 'You are here',
    done: 'Done',
    age: (n: number) => `hero aged ${n}`,
    finish: 'Next: university, a profession and your own exhibitions.',
  },
};

const STEPS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

// Карта пути ученика: дорога из 10 шагов (группы и курсы школы), на каждом —
// маленький герой. Пройденные шаги отмечены, текущий выделен, будущие видны
// заранее, чтобы ребёнок знал, что его ждёт на 5–6 курсе и в Арт-карьере.
export function HeroPath({ hero, level, skin, art, selected, onSelect }: Props) {
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();

  return (
    <View>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.hint}>{s.hint}</Text>
      <View>
        {STEPS.map((l, i) => {
          const done = l < level;
          const current = l === level;
          const future = l > level;
          const active = l === selected;
          return (
            <Pressable
              key={l}
              onPress={() => onSelect(l)}
              style={styles.step}
              accessibilityLabel={levelGroupName(l, lang)}
            >
              <View style={styles.lineCol}>
                <View style={[styles.line, i === 0 && styles.lineHiddenTop, !future && styles.lineDone]} />
                <View
                  style={[
                    styles.dot,
                    done && styles.dotDone,
                    current && styles.dotCurrent,
                    active && styles.dotActive,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : future ? (
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                  ) : (
                    <Ionicons name="star" size={14} color={colors.white} />
                  )}
                </View>
                <View style={[styles.line, i === STEPS.length - 1 && styles.lineHiddenBottom, l < level && styles.lineDone]} />
              </View>
              <View style={[styles.card, current && styles.cardCurrent, active && styles.cardActive, future && styles.cardFuture]}>
                <View style={future && styles.figureFuture}>
                  <HeroFigure hero={hero} level={l} skin={skin} art={art} height={current ? 96 : 72} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.group, future && styles.textFuture]} numberOfLines={2}>
                    {levelGroupName(l, lang)}
                  </Text>
                  <Text style={styles.age}>{s.age(LEVEL_AGE[l - 1])}</Text>
                  {current ? (
                    <View style={styles.hereBadge}>
                      <Text style={styles.hereText}>{s.here}</Text>
                    </View>
                  ) : done ? (
                    <Text style={styles.doneText}>{s.done}</Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.finish}>
        <Ionicons name="trophy" size={18} color={colors.accent} />
        <Text style={styles.finishText}>{s.finish}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, marginBottom: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'stretch' },
  lineCol: { width: 32, alignItems: 'center' },
  line: { flex: 1, width: 4, backgroundColor: colors.border, borderRadius: 2 },
  lineDone: { backgroundColor: colors.accent },
  lineHiddenTop: { backgroundColor: 'transparent' },
  lineHiddenBottom: { backgroundColor: 'transparent' },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotCurrent: { backgroundColor: colors.primary, borderColor: colors.accent, width: 30, height: 30, borderRadius: 15 },
  dotActive: { borderColor: colors.primary },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCurrent: { borderColor: colors.accent, borderWidth: 2, backgroundColor: '#FFF8EA' },
  cardActive: { borderColor: colors.primary },
  cardFuture: { backgroundColor: colors.surfaceAlt },
  figureFuture: { opacity: 0.45 },
  cardText: { flex: 1, paddingVertical: spacing.sm },
  group: { fontSize: 15, fontWeight: '700', color: colors.text },
  textFuture: { color: colors.textMuted },
  age: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  hereBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  hereText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  doneText: { color: colors.success, fontSize: 12, fontWeight: '600', marginTop: spacing.xs },
  finish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  finishText: { flex: 1, color: colors.text, fontSize: 14 },
});
