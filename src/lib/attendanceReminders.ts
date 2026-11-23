import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import {
  addDays,
  changeKey,
  fetchLessonChanges,
  fetchScheduleLessons,
  formatTime,
  isoDayOfWeek,
  toDateKey,
} from './schedule';
import { pick, type Translations } from '../i18n';
import type { Profile } from '../types/database';

// Напоминание преподавателю: через 15 минут после начала занятия телефон
// показывает «Отметьте посещаемость», если группа за этот день отмечена не
// полностью. Родители узнают о пропуске только после отметки «Нет», поэтому
// без отметки они не узнают ничего.
//
// Напоминания планирует сам телефон (как и напоминания о занятиях), сервер
// не нужен. Когда все ученики группы отмечены, напоминание на этот день
// снимается. Пересчёт — при каждом открытии приложения.
const PREFIX = 'attendance-reminder:';
const MINUTES_AFTER_START = 15;
const DAYS_AHEAD = 7;
// На iOS не больше 64 запланированных уведомлений на приложение; часть
// оставляем напоминаниям о занятиях.
const MAX_SCHEDULED = 40;

const TEXT: Translations<{ title: string; body: (group: string) => string }> = {
  ru: {
    title: 'Отметьте посещаемость',
    body: (group) => `Группа «${group}» ещё не отмечена. Родители узнают о пропуске, только когда вы поставите «Нет».`,
  },
  kk: {
    title: 'Қатысуды белгілеңіз',
    body: (group) => `«${group}» тобы әлі белгіленбеген. Ата-аналар баланың келмегенін «Жоқ» қойғаннан кейін ғана біледі.`,
  },
  en: {
    title: 'Mark attendance',
    body: (group) => `Group “${group}” is not marked yet. Parents learn about an absence only after you mark “Absent”.`,
  },
};

function identifier(groupId: string, dateKey: string): string {
  return `${PREFIX}${groupId}:${dateKey}`;
}

async function cancelAll() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// Вызывается, когда все ученики группы отмечены за день.
export async function cancelAttendanceReminder(groupId: string, dateKey: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier(groupId, dateKey));
  } catch {
    // Напоминания могло и не быть.
  }
}

// Группы, где у всех учеников уже есть отметка за этот день.
async function fullyMarkedGroups(groupIds: string[], dateKey: string): Promise<Set<string>> {
  const done = new Set<string>();
  if (groupIds.length === 0) return done;
  const [{ data: members }, { data: marks }] = await Promise.all([
    supabase.from('group_members').select('group_id, student_id').in('group_id', groupIds),
    supabase
      .from('attendance')
      .select('group_id, student_id')
      .in('group_id', groupIds)
      .eq('lesson_date', dateKey)
      .is('lesson_id', null),
  ]);
  const marked = new Set((marks ?? []).map((r) => `${r.group_id}:${r.student_id}`));
  const total = new Map<string, number>();
  const missing = new Map<string, number>();
  for (const row of members ?? []) {
    total.set(row.group_id, (total.get(row.group_id) ?? 0) + 1);
    if (!marked.has(`${row.group_id}:${row.student_id}`)) {
      missing.set(row.group_id, (missing.get(row.group_id) ?? 0) + 1);
    }
  }
  for (const groupId of groupIds) {
    // Пустая группа — отмечать некого.
    if (!total.get(groupId) || !missing.get(groupId)) done.add(groupId);
  }
  return done;
}

export async function syncAttendanceReminders(profile: Profile | null): Promise<void> {
  try {
    await cancelAll();
    // Только преподавателям (и администраторам), за которыми закреплены группы.
    if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) return;
    if (profile.notify_reminders === false) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const { data: groups, error } = await supabase.from('groups').select('id').eq('teacher_id', profile.id);
    if (error) throw error;
    const groupIds = (groups ?? []).map((g) => g.id as string);
    if (groupIds.length === 0) return;

    const lessons = await fetchScheduleLessons(groupIds);
    const today = new Date();
    const todayKey = toDateKey(today);
    const changes = await fetchLessonChanges(
      lessons.map((l) => l.id),
      todayKey,
      toDateKey(addDays(today, DAYS_AHEAD))
    );
    const byKey = new Map(changes.map((c) => [changeKey(c.lesson_id, c.lesson_date), c]));
    const markedToday = await fullyMarkedGroups(groupIds, todayKey);
    const text = pick(TEXT);
    const now = Date.now();
    let count = 0;

    for (let offset = 0; offset <= DAYS_AHEAD; offset++) {
      const day = addDays(today, offset);
      const dateKey = toDateKey(day);
      // Одно напоминание на группу в день — после начала первого её занятия.
      const first = new Map<string, { at: Date; groupName: string }>();
      for (const lesson of lessons) {
        if (lesson.day_of_week !== isoDayOfWeek(day)) continue;
        if (offset === 0 && markedToday.has(lesson.group_id)) continue;
        const change = byKey.get(changeKey(lesson.id, dateKey));
        if (change?.cancelled) continue;
        const start = formatTime(change?.start_time ?? lesson.start_time);
        const [h, m] = start.split(':').map(Number);
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m + MINUTES_AFTER_START);
        const prev = first.get(lesson.group_id);
        if (!prev || prev.at > at) first.set(lesson.group_id, { at, groupName: lesson.group_name });
      }
      for (const [groupId, { at, groupName }] of first) {
        if (at.getTime() <= now + 60 * 1000) continue;
        if (count >= MAX_SCHEDULED) return;
        count++;
        await Notifications.scheduleNotificationAsync({
          identifier: identifier(groupId, dateKey),
          content: {
            title: text.title,
            body: text.body(groupName),
            data: { type: 'attendance_reminder', groupId, groupName, date: dateKey },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
        });
      }
    }
  } catch (e) {
    // Напоминания — удобство: ошибка не должна мешать работе приложения.
    console.warn('Не удалось запланировать напоминания о посещаемости:', e instanceof Error ? e.message : e);
  }
}
