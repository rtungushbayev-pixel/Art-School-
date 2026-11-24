import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  EMPTY_XP,
  XP_DAILY,
  XP_STREAK_30,
  XP_STREAK_7,
  dailyTheme,
  fetchHeroXp,
  nextStreakGoal,
  schoolToday,
  type HeroXp,
} from '../lib/dailyDrawing';
import { useLanguage, useStrings } from '../i18n';
import { colors, radius, shadow, spacing } from '../theme/colors';

const STRINGS = {
  ru: {
    kicker: 'Рисунок дня',
    draw: (xp: number) => `Нарисовать · +${xp} опыта`,
    done: 'Сегодня нарисовано',
    streak: (n: number) => `${n} дн. подряд`,
    noStreak: 'Огонёк не горит',
    goal: (n: number, goal: number, xp: number) => `${n} из ${goal} дней до награды +${xp}`,
    allGoals: 'Все награды за серию получены!',
    keep: 'Нарисуй сегодня, чтобы огонёк не погас',
  },
  kk: {
    kicker: 'Күн суреті',
    draw: (xp: number) => `Салу · +${xp} тәжірибе`,
    done: 'Бүгін салынды',
    streak: (n: number) => `${n} күн қатарынан`,
    noStreak: 'От жанбай тұр',
    goal: (n: number, goal: number, xp: number) => `Сыйлыққа дейін ${goal} күннің ${n}-і · +${xp}`,
    allGoals: 'Сериядағы барлық сыйлық алынды!',
    keep: 'От сөнбеуі үшін бүгін сал',
  },
  en: {
    kicker: 'Drawing of the day',
    draw: (xp: number) => `Draw · +${xp} XP`,
    done: 'Done for today',
    streak: (n: number) => `${n}-day streak`,
    noStreak: 'No streak yet',
    goal: (n: number, goal: number, xp: number) => `${n} of ${goal} days to a +${xp} reward`,
    allGoals: 'All streak rewards collected!',
    keep: 'Draw today to keep your streak alive',
  },
};

// Карточка «Рисунок дня» в Арт-дворе ученика: тема, огонёк серии, кнопка.
export function DailyDrawingCard({ studentId, onDraw }: { studentId: string; onDraw: () => void }) {
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const [xp, setXp] = useState<HeroXp>(EMPTY_XP);
  const theme = dailyTheme(schoolToday(), lang);

  useFocusEffect(
    useCallback(() => {
      fetchHeroXp(studentId)
        .then(setXp)
        .catch(() => setXp(EMPTY_XP));
    }, [studentId])
  );

  // Следующая награда, которую ещё не получал (каждая — один раз).
  const goal = nextStreakGoal(xp.bestStreak);
  const goalXp = goal === 7 ? XP_STREAK_7 : XP_STREAK_30;
  const lit = xp.streak > 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{s.kicker}</Text>
          <Text style={styles.title}>{theme.title}</Text>
          <Text style={styles.hint}>{theme.hint}</Text>
        </View>
        <View style={[styles.flame, !lit && styles.flameOff]}>
          <Ionicons name="flame" size={26} color={lit ? '#FF7A1A' : '#B8B0CC'} />
          <Text style={[styles.flameNum, !lit && styles.flameNumOff]}>{xp.streak}</Text>
        </View>
      </View>

      <Text style={styles.streak}>
        {lit ? s.streak(xp.streak) : s.noStreak}
        {lit && !xp.drewToday ? ` · ${s.keep}` : ''}
      </Text>
      {goal ? (
        <>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, (xp.streak / goal) * 100)}%` }]} />
          </View>
          <Text style={styles.goal}>{s.goal(xp.streak, goal, goalXp)}</Text>
        </>
      ) : (
        <Text style={styles.goal}>{s.allGoals}</Text>
      )}

      {xp.drewToday ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={20} color="#3DB874" />
          <Text style={styles.doneText}>{s.done}</Text>
        </View>
      ) : (
        <Pressable style={styles.button} onPress={onDraw}>
          <Ionicons name="brush" size={18} color="#4A2F91" />
          <Text style={styles.buttonText}>{s.draw(XP_DAILY)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#4A2F91',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  top: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  kicker: { color: '#FBB31F', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: colors.white, fontSize: 22, fontWeight: '800', marginTop: 2 },
  hint: { color: '#E3DAF7', fontSize: 13, marginTop: 2 },
  flame: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF1E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameOff: { backgroundColor: '#5E46A3' },
  flameNum: { fontSize: 13, fontWeight: '800', color: '#C2410C', marginTop: -2 },
  flameNumOff: { color: '#D6CCF0' },
  streak: { color: colors.white, fontWeight: '700', marginTop: spacing.sm },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#6B55B0', marginTop: spacing.xs, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: '#FBB31F' },
  goal: { color: '#D6CCF0', fontSize: 12, marginTop: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#FBB31F',
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  buttonText: { color: '#4A2F91', fontWeight: '800', fontSize: 15 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  doneText: { color: colors.white, fontWeight: '700' },
});
