import { supabase } from './supabase';
import { sendPushNotification } from './notifications';
import { pick, type Translations } from '../i18n';

export type EventKind = 'exhibition' | 'competition' | 'masterclass' | 'other';
export const EVENT_KINDS: EventKind[] = ['exhibition', 'competition', 'masterclass', 'other'];

export interface SchoolEvent {
  id: string;
  title: string;
  kind: EventKind;
  description: string | null;
  location: string | null;
  starts_on: string;
  ends_on: string | null;
  signup_until: string | null;
  max_participants: number | null;
  created_at: string;
}

export interface Registration {
  event_id: string;
  student_id: string;
  created_at: string;
  student: { id: string; full_name: string } | null;
}

const KIND_LABELS: Translations<Record<EventKind, string>> = {
  ru: { exhibition: 'Выставка', competition: 'Конкурс', masterclass: 'Мастер-класс', other: 'Событие' },
  kk: { exhibition: 'Көрме', competition: 'Байқау', masterclass: 'Шеберлік сыныбы', other: 'Іс-шара' },
  en: { exhibition: 'Exhibition', competition: 'Competition', masterclass: 'Master class', other: 'Event' },
};

export function eventKindLabel(kind: EventKind): string {
  return pick(KIND_LABELS)[kind];
}

export function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function eventDates(e: SchoolEvent): string {
  return e.ends_on && e.ends_on !== e.starts_on
    ? `${formatEventDate(e.starts_on)} — ${formatEventDate(e.ends_on)}`
    : formatEventDate(e.starts_on);
}

export async function fetchEvents(): Promise<SchoolEvent[]> {
  const { data, error } = await supabase.from('school_events').select('*').order('starts_on');
  if (error) throw error;
  return (data as SchoolEvent[]) ?? [];
}

export async function fetchEvent(id: string): Promise<SchoolEvent | null> {
  const { data, error } = await supabase.from('school_events').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as SchoolEvent | null;
}

export async function fetchParticipantCounts(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.rpc('event_participant_counts', { p_event_ids: ids });
  const map: Record<string, number> = {};
  for (const row of (data as { event_id: string; participants: number }[]) ?? []) {
    map[row.event_id] = Number(row.participants);
  }
  return map;
}

// Сотрудник видит всех записавшихся, ученик и родитель — только свои записи.
export async function fetchRegistrations(eventId: string): Promise<Registration[]> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_id, student_id, created_at, student:student_id ( id, full_name )')
    .eq('event_id', eventId)
    .order('created_at');
  if (error) throw error;
  return (data as unknown as Registration[]) ?? [];
}

export async function register(eventId: string, studentId: string): Promise<void> {
  const { error } = await supabase.from('event_registrations').insert({ event_id: eventId, student_id: studentId });
  if (error) throw error;
}

export async function unregister(eventId: string, studentId: string): Promise<void> {
  const { error } = await supabase.from('event_registrations').delete().eq('event_id', eventId).eq('student_id', studentId);
  if (error) throw error;
}

export type EventInput = Omit<SchoolEvent, 'id' | 'created_at'>;

export async function saveEvent(id: string | null, input: EventInput): Promise<void> {
  if (id) {
    const { error } = await supabase.from('school_events').update(input).eq('id', id);
    if (error) throw error;
    return;
  }
  const { data, error } = await supabase.from('school_events').insert(input).select('id').single();
  if (error) throw error;
  // О новом событии сообщаем ученикам и родителям.
  if (data?.id) sendPushNotification({ event: 'school_event', id: data.id as string });
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('school_events').delete().eq('id', id);
  if (error) throw error;
}
