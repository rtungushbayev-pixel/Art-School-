import { supabase } from './supabase';
import { sendPushNotification } from './notifications';
import type { Attendance, AttendanceStatus } from '../types/database';

// Дата в формате базы по местному времени телефона (toISOString дал бы UTC,
// и до 5 утра в Алматы это был бы ещё вчерашний день).
export function localISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function fetchGroupAttendance(groupId: string, date: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('group_id', groupId)
    .eq('lesson_date', date)
    .is('lesson_id', null);
  if (error) throw error;
  return (data as Attendance[]) ?? [];
}

// Отметка ученика. Если «Нет» — родители получают пуш (один раз на отметку).
export async function markAttendance(
  groupId: string,
  studentId: string,
  date: string,
  status: AttendanceStatus
): Promise<void> {
  const { data, error } = await supabase.rpc('mark_attendance', {
    p_group_id: groupId,
    p_student_id: studentId,
    p_date: date,
    p_status: status,
  });
  if (error) throw error;
  if (status === 'absent' && typeof data === 'string') {
    sendPushNotification({ event: 'attendance_absent', id: data });
  }
}
