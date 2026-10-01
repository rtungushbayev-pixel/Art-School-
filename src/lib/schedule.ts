import { supabase } from './supabase';
import type { Lesson, LessonChange } from '../types/database';

export const DAY_NAMES = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const DAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export interface ScheduleLesson extends Lesson {
  group_name: string;
  teacher_name: string | null;
}

// Даты считаются в локальном времени устройства, без часовых поясов:
// занятие «во вторник в 15:00» — это вторник по календарю школы.
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 1 = понедельник ... 7 = воскресенье, как lessons.day_of_week
export function isoDayOfWeek(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfWeek(date: Date): Date {
  return addDays(date, 1 - isoDayOfWeek(date));
}

export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export async function fetchScheduleLessons(groupIds: string[] | null): Promise<ScheduleLesson[]> {
  if (groupIds && groupIds.length === 0) return [];
  let request = supabase
    .from('lessons')
    .select('*, groups:group_id ( name, teacher:teacher_id ( full_name ) )')
    .order('day_of_week')
    .order('start_time');
  if (groupIds) request = request.in('group_id', groupIds);
  const { data, error } = await request;
  if (error) throw error;
  return ((data as any[]) ?? []).map(({ groups, ...lesson }) => ({
    ...(lesson as Lesson),
    group_name: groups?.name ?? '',
    teacher_name: groups?.teacher?.full_name ?? null,
  }));
}

export async function fetchStudentGroupIds(studentId: string): Promise<string[]> {
  const { data, error } = await supabase.from('group_members').select('group_id').eq('student_id', studentId);
  if (error) throw error;
  return (data ?? []).map((m) => m.group_id as string);
}

// Группа, которую родитель выбрал при регистрации (пока ребёнок не привязан).
export async function fetchParentChosenGroupIds(parentId: string): Promise<string[]> {
  const { data, error } = await supabase.from('parent_groups').select('group_id').eq('parent_id', parentId);
  if (error) throw error;
  return (data ?? []).map((r) => r.group_id as string);
}

export interface SignupGroup {
  id: string;
  name: string;
}

// Доступно и до входа: список групп для экрана регистрации.
export async function fetchSignupGroups(): Promise<SignupGroup[]> {
  const { data, error } = await supabase.rpc('list_signup_groups');
  if (error) throw error;
  return (data as SignupGroup[]) ?? [];
}

export async function fetchLessonChanges(
  lessonIds: string[],
  fromDate: string,
  toDate: string
): Promise<LessonChange[]> {
  if (lessonIds.length === 0) return [];
  const { data, error } = await supabase
    .from('lesson_changes')
    .select('*')
    .in('lesson_id', lessonIds)
    .gte('lesson_date', fromDate)
    .lte('lesson_date', toDate);
  if (error) throw error;
  return (data as LessonChange[]) ?? [];
}

export function changeKey(lessonId: string, date: string): string {
  return `${lessonId}:${date}`;
}
