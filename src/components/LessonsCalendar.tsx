import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { supabase } from '../lib/supabase';
import { localISODate } from '../lib/attendance';
import { useLanguage, useStrings, type Lang } from '../i18n';
import { colors, paint, radius, spacing } from '../theme/colors';

const MONTHS: Record<Lang, string[]> = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  kk: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const STRINGS = {
  ru: {
    title: 'Мои занятия',
    weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    lessons: (n: number): string => {
      const m10 = n % 10;
      const m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return 'занятие';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'занятия';
      return 'занятий';
    },
    hint: 'Отмечены дни, когда вы были на занятии',
  },
  kk: {
    title: 'Менің сабақтарым',
    weekdays: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'],
    lessons: () => 'сабақ',
    hint: 'Сабақта болған күндеріңіз белгіленген',
  },
  en: {
    title: 'My lessons',
    weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    lessons: (n: number) => (n === 1 ? 'lesson' : 'lessons'),
    hint: 'Days you attended are marked',
  },
};

const CELL = 30;

// Карточка в профиле ученика: месяц, сколько занятий посетил и календарь,
// где отмечены дни посещения («Есть» и «Опоздал»). Текущая неделя подсвечена.
export function LessonsCalendar({ studentId }: { studentId: string }) {
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [attended, setAttended] = useState<Set<string>>(new Set());

  useEffect(() => {
    const from = localISODate(month);
    const to = localISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    let cancelled = false;
    supabase
      .from('attendance')
      .select('lesson_date, status')
      .eq('student_id', studentId)
      .gte('lesson_date', from)
      .lte('lesson_date', to)
      .in('status', ['present', 'late'])
      .then(({ data }) => {
        if (!cancelled) setAttended(new Set(((data as { lesson_date: string }[] | null) ?? []).map((r) => r.lesson_date)));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, month]);

  // Недели месяца: по 7 ячеек с понедельника, пустые — null.
  const weeks = useMemo(() => {
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const offset = (month.getDay() + 6) % 7;
    const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    while (cells.length % 7) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [month]);

  const today = new Date();
  const isThisMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();
  const isFuture = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const shift = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const dateKey = (day: number) => localISODate(new Date(month.getFullYear(), month.getMonth(), day));

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{s.title}</Text>
        <View style={styles.nav}>
          <Pressable onPress={() => shift(-1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => shift(1)} hitSlop={10} disabled={isThisMonth || isFuture}>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isThisMonth || isFuture ? colors.border : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.summary}>
          <Text style={styles.month}>{MONTHS[lang][month.getMonth()]}</Text>
          <Text style={styles.count}>
            {attended.size}
            <Text style={styles.countLabel}> {s.lessons(attended.size)}</Text>
          </Text>
        </View>

        <View>
          <View style={styles.row}>
            {s.weekdays.map((w) => (
              <Text key={w} style={[styles.cell, styles.weekday]}>
                {w}
              </Text>
            ))}
          </View>
          {weeks.map((week, i) => {
            const currentWeek = isThisMonth && week.includes(today.getDate());
            return (
              <View key={i} style={[styles.row, currentWeek && styles.currentWeek]}>
                {week.map((day, j) => {
                  if (!day) return <View key={j} style={styles.cellBox} />;
                  const was = attended.has(dateKey(day));
                  const isToday = isThisMonth && day === today.getDate();
                  return (
                    <View key={j} style={styles.cellBox}>
                      <View style={[styles.dot, was && styles.dotAttended, isToday && !was && styles.dotToday]}>
                        <Text style={[styles.day, was && styles.dayAttended]}>{day}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.hint}>{s.hint}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  nav: { flexDirection: 'row', gap: spacing.md },
  body: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.md },
  summary: { flexShrink: 1, paddingRight: spacing.sm, paddingBottom: spacing.xs },
  month: { fontSize: 16, color: colors.textMuted },
  count: { fontSize: 44, fontWeight: '700', color: colors.text },
  countLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  row: { flexDirection: 'row', borderRadius: radius.full },
  currentWeek: { backgroundColor: paint.ochre + '55' },
  cell: { width: CELL, textAlign: 'center' },
  cellBox: { width: CELL, height: CELL + 4, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 },
  dot: { width: CELL - 4, height: CELL - 4, borderRadius: (CELL - 4) / 2, alignItems: 'center', justifyContent: 'center' },
  dotAttended: { backgroundColor: paint.violet },
  dotToday: { borderWidth: 1.5, borderColor: colors.primary },
  day: { fontSize: 13, color: colors.text },
  dayAttended: { color: colors.white, fontWeight: '700' },
  hint: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    color: colors.textMuted,
    fontSize: 13,
  },
});
