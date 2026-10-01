import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchChildren } from '../../lib/parents';
import type { Profile } from '../../types/database';
import {
  DAY_NAMES,
  addDays,
  changeKey,
  fetchLessonChanges,
  fetchScheduleLessons,
  fetchParentChosenGroupIds,
  fetchStudentGroupIds,
  formatDayMonth,
  formatTime,
  startOfWeek,
  toDateKey,
  type ScheduleLesson,
} from '../../lib/schedule';
import { colors, radius, spacing } from '../../theme/colors';
import type { LessonChange } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

// Расписание на конкретную неделю: регулярные занятия + разовые изменения
// (отмена, перенос) на даты этой недели. Ученик видит занятия своих групп,
// сотрудник — всей школы и может отменить или перенести занятие на дату.
export function ScheduleScreen() {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'staff';
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();

  const [weekOffset, setWeekOffset] = useState(0);
  const [lessons, setLessons] = useState<ScheduleLesson[]>([]);
  const [changes, setChanges] = useState<Map<string, LessonChange>>(new Map());
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Родитель: дети и выбранный ребёнок — показываем расписание его групп.
  const isParent = profile?.role === 'parent';
  const [children, setChildren] = useState<Profile[]>([]);
  const [childId, setChildId] = useState<string | null>(null);

  const today = toDateKey(new Date());
  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekDates = useMemo(() => [1, 2, 3, 4, 5, 6, 7].map((day) => addDays(weekStart, day - 1)), [weekStart]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let groupIds: string[] | null = null;
      if (isParent) {
        const kids = await fetchChildren(profile.id);
        setChildren(kids);
        const selected = kids.find((k) => k.id === childId) ?? kids[0] ?? null;
        if (selected && selected.id !== childId) setChildId(selected.id);
        // Пока ни один ребёнок не привязан — группа, выбранная при регистрации.
        groupIds = selected
          ? await fetchStudentGroupIds(selected.id)
          : await fetchParentChosenGroupIds(profile.id);
      } else if (!isStaff) {
        groupIds = await fetchStudentGroupIds(profile.id);
      }
      const lessonRows = await fetchScheduleLessons(groupIds);
      const changeRows = await fetchLessonChanges(
        lessonRows.map((l) => l.id),
        toDateKey(weekDates[0]),
        toDateKey(weekDates[6])
      );
      setLessons(lessonRows);
      setChanges(new Map(changeRows.map((c) => [changeKey(c.lesson_id, c.lesson_date), c])));
    } catch {
      // Нет сети — оставляем то, что уже показано; потянуть вниз, чтобы повторить.
    }
    setLoading(false);
  }, [profile, isStaff, isParent, childId, weekDates]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const groups = useMemo(() => {
    const byId = new Map<string, string>();
    for (const l of lessons) byId.set(l.group_id, l.group_name);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [lessons]);

  const visibleLessons = groupFilter ? lessons.filter((l) => l.group_id === groupFilter) : lessons;

  const weekTitle =
    weekOffset === 0
      ? 'Эта неделя'
      : weekOffset === 1
        ? 'Следующая неделя'
        : weekOffset === -1
          ? 'Прошлая неделя'
          : `${formatDayMonth(weekDates[0])} – ${formatDayMonth(weekDates[6])}`;

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>

      <View style={styles.weekNav}>
        <Pressable hitSlop={12} onPress={() => setWeekOffset((w) => w - 1)}>
          <Text style={styles.weekArrow}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setWeekOffset(0)} style={styles.weekCenter}>
          <Text style={styles.weekTitle}>{weekTitle}</Text>
          <Text style={styles.weekRange}>
            {formatDayMonth(weekDates[0])} – {formatDayMonth(weekDates[6])}
          </Text>
        </Pressable>
        <Pressable hitSlop={12} onPress={() => setWeekOffset((w) => w + 1)}>
          <Text style={styles.weekArrow}>›</Text>
        </Pressable>
      </View>

      {isParent && children.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {children.map((child) => (
            <Chip
              key={child.id}
              label={child.full_name || 'Ребёнок'}
              active={childId === child.id}
              onPress={() => setChildId(child.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {isStaff && groups.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <Chip label="Все группы" active={!groupFilter} onPress={() => setGroupFilter(null)} />
          {groups.map(([id, name]) => (
            <Chip key={id} label={name} active={groupFilter === id} onPress={() => setGroupFilter(id)} />
          ))}
        </ScrollView>
      ) : null}

      {visibleLessons.length === 0 && !loading ? (
        <Card>
          <Text style={styles.empty}>
            {isStaff ? 'Пока нет занятий в расписании' : isParent
                ? children.length > 0
                  ? 'Ребёнок пока не записан в группу, или у группы нет занятий'
                  : 'Добавьте ребёнка в Профиль → «Мои дети», и здесь появится его расписание'
                : 'Вы пока не записаны в группу, или у группы нет занятий'}
          </Text>
        </Card>
      ) : null}

      {weekDates.map((date, index) => {
        const day = index + 1;
        const dateKey = toDateKey(date);
        const dayLessons = visibleLessons.filter((l) => l.day_of_week === day);
        if (dayLessons.length === 0) return null;
        const isToday = dateKey === today;
        const isPast = dateKey < today;
        return (
          <View key={dateKey} style={[styles.dayBlock, isPast && styles.past]}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayTitle, isToday && styles.todayTitle]}>
                {DAY_NAMES[day]}, {formatDayMonth(date)}
              </Text>
              {isToday ? <Text style={styles.todayBadge}>Сегодня</Text> : null}
            </View>
            {dayLessons.map((lesson) => {
              const change = changes.get(changeKey(lesson.id, dateKey));
              const card = <LessonCard lesson={lesson} change={change} />;
              return isStaff ? (
                <Pressable
                  key={lesson.id}
                  onPress={() => navigation.navigate('LessonChange', { lessonId: lesson.id, date: dateKey })}
                >
                  {card}
                </Pressable>
              ) : (
                <View key={lesson.id}>{card}</View>
              );
            })}
          </View>
        );
      })}

      {isStaff && visibleLessons.length > 0 ? (
        <Text style={styles.hint}>Нажмите на занятие, чтобы отменить или перенести его на эту дату</Text>
      ) : null}
    </Screen>
  );
}

function LessonCard({ lesson, change }: { lesson: ScheduleLesson; change?: LessonChange }) {
  const cancelled = !!change?.cancelled;
  const moved = !cancelled && !!change && (!!change.start_time || !!change.room);
  const start = !cancelled && change?.start_time ? change.start_time : lesson.start_time;
  const end = !cancelled && change?.end_time ? change.end_time : lesson.end_time;
  const room = !cancelled && change?.room ? change.room : lesson.room;

  return (
    <Card style={[styles.lessonCard, cancelled && styles.cancelledCard]}>
      <View style={styles.timeCol}>
        <Text style={[styles.time, cancelled && styles.struck]}>{formatTime(start)}</Text>
        <Text style={[styles.timeEnd, cancelled && styles.struck]}>{formatTime(end)}</Text>
      </View>
      <View style={styles.lessonInfo}>
        <Text style={[styles.lessonTitle, cancelled && styles.struck]}>{lesson.title}</Text>
        <Text style={styles.meta}>
          {lesson.group_name}
          {lesson.teacher_name ? ` · ${lesson.teacher_name}` : ''}
        </Text>
        {room ? <Text style={styles.meta}>Кабинет {room}</Text> : null}
        {cancelled ? <Text style={[styles.badge, styles.badgeCancelled]}>Отменено</Text> : null}
        {moved ? (
          <Text style={[styles.badge, styles.badgeMoved]}>
            Изменено: было {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
            {lesson.room ? `, каб. ${lesson.room}` : ''}
          </Text>
        ) : null}
        {change?.note ? <Text style={styles.note}>{change.note}</Text> : null}
      </View>
    </Card>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center' },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  weekArrow: { fontSize: 28, color: colors.primary, fontWeight: '700', paddingHorizontal: spacing.sm },
  weekCenter: { alignItems: 'center', flex: 1 },
  weekTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  weekRange: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  filters: { marginBottom: spacing.md, flexGrow: 0 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
  dayBlock: { marginBottom: spacing.md },
  past: { opacity: 0.55 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  dayTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  todayTitle: { color: colors.text },
  todayBadge: {
    backgroundColor: colors.accent,
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  lessonCard: { flexDirection: 'row', alignItems: 'flex-start' },
  cancelledCard: { backgroundColor: colors.surfaceAlt },
  timeCol: { width: 64 },
  time: { fontWeight: '700', color: colors.text, fontSize: 16 },
  timeEnd: { color: colors.textMuted, marginTop: 2 },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 2 },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeCancelled: { backgroundColor: colors.danger, color: colors.white },
  badgeMoved: { backgroundColor: colors.warning, color: colors.white },
  note: { color: colors.text, marginTop: spacing.xs, fontStyle: 'italic' },
  hint: { color: colors.textMuted, textAlign: 'center', fontSize: 12, marginBottom: spacing.lg },
});
