import { Platform } from 'react-native';
import { supabase } from './supabase';
import { sendPushNotification } from './notifications';
import { getLang, pick, type Translations } from '../i18n';
import type { Profile, SupportCategory, SupportMessage, SupportStatus, SupportTicket } from '../types/database';

const CATEGORY_LABELS: Translations<Record<SupportCategory, string>> = {
  ru: {
    bug: 'Проблема с приложением',
    schedule: 'Проблема с расписанием',
    operations: 'Инфраструктура и операционные вопросы',
    // Только у старых обращений: в новых этой причины нет.
    question: 'Вопрос администрации',
    other: 'Другое',
  },
  kk: {
    bug: 'Қолданбадағы ақау',
    schedule: 'Кестеге қатысты мәселе',
    operations: 'Инфрақұрылым және операциялық мәселелер',
    question: 'Әкімшілікке сұрақ',
    other: 'Басқа',
  },
  en: {
    bug: 'App problem',
    schedule: 'Schedule problem',
    operations: 'Facilities and operations',
    question: 'Question for the administration',
    other: 'Other',
  },
};

export function supportCategoryLabel(category: SupportCategory): string {
  return pick(CATEGORY_LABELS)[category];
}

const CATEGORY_HINTS: Translations<Record<'bug' | 'schedule' | 'operations' | 'other', string>> = {
  ru: {
    bug: 'Что-то не работает, зависает или показывает ошибку',
    schedule: 'Неверное время, отмена или перенос занятия',
    operations: 'Помещения, оборудование, материалы, доступ в школу',
    other: 'Предложение или любой другой вопрос',
  },
  kk: {
    bug: 'Бірдеңе жұмыс істемейді, қатып қалады немесе қате көрсетеді',
    schedule: 'Сабақ уақыты қате, сабақ тоқтатылды немесе ауыстырылды',
    operations: 'Бөлмелер, жабдықтар, материалдар, мектепке кіру',
    other: 'Ұсыныс немесе кез келген басқа сұрақ',
  },
  en: {
    bug: 'Something doesn’t work, freezes or shows an error',
    schedule: 'Wrong time, cancelled or rescheduled class',
    operations: 'Rooms, equipment, supplies, access to the school',
    other: 'A suggestion or any other question',
  },
};

// Причины, которые можно выбрать в новом обращении, в порядке показа.
export function supportCategories(): { value: SupportCategory; hint: string; icon: string }[] {
  const hints = pick(CATEGORY_HINTS);
  return [
    { value: 'bug', hint: hints.bug, icon: 'phone-portrait-outline' },
    { value: 'schedule', hint: hints.schedule, icon: 'calendar-outline' },
    { value: 'operations', hint: hints.operations, icon: 'business-outline' },
    { value: 'other', hint: hints.other, icon: 'chatbubbles-outline' },
  ];
}

const STATUS_LABELS: Translations<Record<SupportStatus, string>> = {
  ru: { open: 'Ждёт ответа', answered: 'Есть ответ', closed: 'Закрыто' },
  kk: { open: 'Жауап күтуде', answered: 'Жауап бар', closed: 'Жабылды' },
  en: { open: 'Awaiting reply', answered: 'Answered', closed: 'Closed' },
};

export function supportStatusLabel(status: SupportStatus): string {
  return pick(STATUS_LABELS)[status];
}

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
const MONTHS: Translations<string[]> = {
  ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  kk: ['қаң.', 'ақп.', 'нау.', 'сәу.', 'мам.', 'мау.', 'шіл.', 'там.', 'қыр.', 'қаз.', 'қар.', 'жел.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function formatSupportDate(iso: string) {
  const d = new Date(iso);
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const month = pick(MONTHS)[d.getMonth()];
  if (getLang() === 'en') return `${month} ${d.getDate()}, ${time}`;
  return `${d.getDate()} ${month}, ${time}`;
}
