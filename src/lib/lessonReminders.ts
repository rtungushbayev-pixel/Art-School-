import * as Notifications from 'expo-notifications';
import { fetchChildren } from './parents';
import {
  addDays,
  changeKey,
  fetchLessonChanges,
  fetchScheduleLessons,
  fetchStudentGroupIds,
  formatTime,
  isoDayOfWeek,
  toDateKey,
} from './schedule';
import { pick, type Translations } from '../i18n';
import type { Profile } from '../types/database';

// Напоминания о занятиях: телефон сам показывает уведомление за 2 часа до
// занятия. Расписание на 14 дней вперёд пересчитывается при каждом открытии
// приложения, поэтому отмены и переносы учитываются.
const PREFIX = 'lesson-reminder:';
const HOURS_BEFORE = 2;
const DAYS_AHEAD = 14;

const TEXT: Translations<{
  title: string;
  body: (who: string | null, group: string, time: string, room: string | null) => string;
}> = {
  ru: {
    title: 'Занятие через 2 часа',
    body: (who, group, time, room) => `${who ? `${who}: ` : ''}${group} в ${time}${room ? `, каб. ${room}` : ''}`,
  },
  kk: {
    title: 'Сабаққа 2 сағат қалды',
    body: (who, group, time, room) => `${who ? `${who}: ` : ''}${group}, ${time}${room ? `, ${room} каб.` : ''}`,
  },
  en: {
    title: 'Class in 2 hours',
    body: (who, group, time, room) => `${who ? `${who}: ` : ''}${group} at ${time}${room ? `, room ${room}` : ''}`,
  },
};

async function cancelAll() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// Кому напоминать: ученику — о своих группах, родителю — о группах детей
// (с именем ребёнка). Сотрудникам напоминания не нужны.
async function targets(profile: Profile): Promise<{ groupId: string; who: string | null }[]> {
  if (profile.role === 'student') {
    return (await fetchStudentGroupIds(profile.id)).map((groupId) => ({ groupId, who: null }));
  }
  if (profile.role === 'parent') {
    const children = await fetchChildren(profile.id);
    const result: { groupId: string; who: string | null }[] = [];
    for (const child of children) {
      for (const groupId of await fetchStudentGroupIds(child.id)) {
        result.push({ groupId, who: child.full_name.split(' ')[0] || child.full_name });
      }
    }
    return result;
  }
  return [];
}

export async function syncLessonReminders(profile: Profile | null): Promise<void> {
  try {
    await cancelAll();
    if (!profile || profile.notify_reminders === false) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const list = await targets(profile);
    if (list.length === 0) return;
    const lessons = await fetchScheduleLessons([...new Set(list.map((t) => t.groupId))]);
    const today = new Date();
    const changes = await fetchLessonChanges(
      lessons.map((l) => l.id),
      toDateKey(today),
      toDateKey(addDays(today, DAYS_AHEAD))
    );
    const byKey = new Map(changes.map((c) => [changeKey(c.lesson_id, c.lesson_date), c]));
    const text = pick(TEXT);
    const now = Date.now();
    let count = 0;

    for (let offset = 0; offset <= DAYS_AHEAD; offset++) {
      const day = addDays(today, offset);
      const dateKey = toDateKey(day);
      for (const lesson of lessons) {
        if (lesson.day_of_week !== isoDayOfWeek(day)) continue;
        const change = byKey.get(changeKey(lesson.id, dateKey));
        if (change?.cancelled) continue;
        const start = formatTime(change?.start_time ?? lesson.start_time);
        const [h, m] = start.split(':').map(Number);
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h - HOURS_BEFORE, m);
        if (at.getTime() <= now + 60 * 1000) continue;
        for (const t of list.filter((x) => x.groupId === lesson.group_id)) {
          // На iOS не больше 64 запланированных уведомлений на приложение.
          if (count >= 60) return;
          count++;
          await Notifications.scheduleNotificationAsync({
            identifier: `${PREFIX}${lesson.id}:${dateKey}:${t.who ?? 'me'}`,
            content: {
              title: text.title,
              body: text.body(t.who, lesson.group_name, start, change?.room ?? lesson.room),
              data: { type: 'lesson_reminder' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
          });
        }
      }
    }
  } catch (e) {
    // Напоминания — удобство: ошибка не должна мешать работе приложения.
    console.warn('Не удалось запланировать напоминания:', e instanceof Error ? e.message : e);
  }
}
