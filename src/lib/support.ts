import { Platform } from 'react-native';
import { supabase } from './supabase';
import { sendPushNotification } from './notifications';
import type { Profile, SupportCategory, SupportMessage, SupportStatus, SupportTicket } from '../types/database';

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug: 'Ошибка в приложении',
  question: 'Вопрос администрации',
  other: 'Другое',
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Ждёт ответа',
  answered: 'Есть ответ',
  closed: 'Закрыто',
};

type AuthorPreview = Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>;

export type SupportTicketWithAuthor = SupportTicket & { author: AuthorPreview | null };
export type SupportMessageWithAuthor = SupportMessage & { author: AuthorPreview | null };

const AUTHOR_SELECT = 'author:author_id ( id, full_name, avatar_url, role )';

// Без фильтра: ученик получит только свои обращения (RLS), сотрудник — все.
export async function fetchSupportTickets(authorId?: string): Promise<SupportTicketWithAuthor[]> {
  let request = supabase
    .from('support_tickets')
    .select(`*, ${AUTHOR_SELECT}`)
    .order('last_message_at', { ascending: false });
  if (authorId) request = request.eq('author_id', authorId);
  const { data, error } = await request;
  if (error) throw error;
  return (data as SupportTicketWithAuthor[]) ?? [];
}

export async function fetchSupportTicket(ticketId: string): Promise<SupportTicketWithAuthor | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`*, ${AUTHOR_SELECT}`)
    .eq('id', ticketId)
    .maybeSingle();
  if (error) throw error;
  return data as SupportTicketWithAuthor | null;
}

export async function fetchSupportMessages(ticketId: string): Promise<SupportMessageWithAuthor[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select(`*, ${AUTHOR_SELECT}`)
    .eq('ticket_id', ticketId)
    .order('created_at');
  if (error) throw error;
  return (data as SupportMessageWithAuthor[]) ?? [];
}

function deviceInfo() {
  return `${Platform.OS} ${Platform.Version}`;
}

export async function createSupportTicket(category: SupportCategory, subject: string, body: string) {
  const { data, error } = await supabase
    .rpc('create_support_ticket', {
      p_category: category,
      p_subject: subject,
      p_body: body,
      p_device_info: deviceInfo(),
    })
    .single();
  if (error) throw error;
  const { ticket_id, message_id } = data as { ticket_id: string; message_id: string };
  // Сбой рассылки не критичен: обращение уже сохранено.
  await sendPushNotification({ event: 'support_message', id: message_id });
  return ticket_id;
}

export async function sendSupportMessage(ticketId: string, authorId: string, body: string) {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticketId, author_id: authorId, body })
    .select('id')
    .single();
  if (error) throw error;
  await sendPushNotification({ event: 'support_message', id: data.id });
}

export async function setSupportTicketStatus(ticketId: string, status: SupportStatus) {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
  if (error) throw error;
}

// «1 окт., 14:05». Без Intl: на Hermes набор локалей зависит от сборки.
const MONTHS = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];

export function formatSupportDate(iso: string) {
  const d = new Date(iso);
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${time}`;
}
