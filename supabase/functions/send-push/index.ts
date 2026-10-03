// Supabase Edge Function: send-push
//
// Рассылает push-уведомление о событии в приложении. Клиент передаёт только
// тип события и ID записи — получателей, текст и право на отправку функция
// определяет сама по данным в базе, поэтому через неё нельзя разослать
// произвольный текст произвольным пользователям:
//
//   post_comment      { id: comment_id }      — автор комментария → автору работы
//   post_moderated    { id: post_id }         — сотрудник → автору работы
//   listing_moderated { id: listing_id }      — сотрудник → продавцу
//   announcement      { id: announcement_id } — сотрудник → аудитории объявления
//   support_message   { id: message_id }      — автор обращения → всем сотрудникам,
//                                               сотрудник → автору обращения
//
// Каждое событие рассылается не более одного раза (таблица push_events).
// Получатели, отключившие категорию в настройках (profiles.notify_*),
// пропускаются. Push-токены читаются из push_tokens через service role —
// клиенту эта таблица недоступна.
//
// Деплой: supabase functions deploy send-push
// (SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY передаются в функцию автоматически)
//
// Необязательно: если в Expo включён Enhanced Push Security, задайте секрет
// EXPO_ACCESS_TOKEN — тогда без него Expo не примет пуш даже по украденному токену.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

type PushEvent = 'post_comment' | 'post_moderated' | 'listing_moderated' | 'announcement' | 'support_message';
type NotificationCategory = 'announcements' | 'comments' | 'moderation' | 'support';

interface RequestBody {
  event: PushEvent;
  id: string;
}

interface Caller {
  id: string;
  role: 'student' | 'staff' | 'parent' | 'admin';
  full_name: string;
}

// Что и кому отправить; null — отправлять нечего (например, автор
// прокомментировал собственную работу).
interface PushMessage {
  dedupKey: string;
  category: NotificationCategory;
  recipientIds: string[];
  title: string;
  body: string;
  data: Record<string, unknown>;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Категория → колонка профиля с настройкой получателя.
const CATEGORY_COLUMNS: Record<NotificationCategory, string> = {
  announcements: 'notify_announcements',
  comments: 'notify_comments',
  moderation: 'notify_moderation',
  support: 'notify_support',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;
const MAX_BODY_LENGTH = 180;

// Функцию вызывает только мобильное приложение, браузерам доступ не нужен,
// поэтому разрешающих CORS-заголовков нет.
function corsHeaders(): Record<string, string> {
  return {};
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function truncate(text: string) {
  return text.length > MAX_BODY_LENGTH ? `${text.slice(0, MAX_BODY_LENGTH - 1)}…` : text;
}

function requireStaff(caller: Caller) {
  if (caller.role !== 'staff' && caller.role !== 'admin') {
    throw new HttpError(403, 'Только сотрудники могут отправлять это уведомление');
  }
}

async function getCaller(admin: SupabaseClient, req: Request): Promise<Caller> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) throw new HttpError(401, 'Требуется авторизация');

  // anon-ключ — тоже валидный JWT, но пользователя за ним нет.
  const { data: auth, error } = await admin.auth.getUser(jwt);
  if (error || !auth.user) throw new HttpError(401, 'Требуется авторизация');

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', auth.user.id)
    .single();
  if (!profile) throw new HttpError(401, 'Профиль не найден');
  return profile as Caller;
}

async function buildMessage(admin: SupabaseClient, caller: Caller, { event, id }: RequestBody): Promise<PushMessage | null> {
  switch (event) {
    case 'post_comment': {
      const { data: comment } = await admin
        .from('post_comments')
        .select('id, post_id, author_id, content, post:post_id ( author_id )')
        .eq('id', id)
        .single();
      if (!comment) throw new HttpError(404, 'Комментарий не найден');
      if (comment.author_id !== caller.id) throw new HttpError(403, 'Это не ваш комментарий');
      const postAuthorId = (comment.post as unknown as { author_id: string } | null)?.author_id;
      if (!postAuthorId) return null;
      return {
        dedupKey: `post_comment:${comment.id}`,
        category: 'comments',
        recipientIds: [postAuthorId],
        title: `${caller.full_name} прокомментировал(а) вашу работу`,
        body: truncate(comment.content),
        data: { type: 'post_comment', postId: comment.post_id },
      };
    }

    case 'post_moderated': {
      requireStaff(caller);
      const { data: post } = await admin
        .from('posts')
        .select('id, author_id, status, moderated_at')
        .eq('id', id)
        .single();
      if (!post) throw new HttpError(404, 'Публикация не найдена');
      if (post.status === 'pending') throw new HttpError(409, 'Публикация ещё не проверена');
      const approved = post.status === 'approved';
      return {
        // Повторное решение по той же работе (другой статус/время) — новое событие.
        dedupKey: `post_moderated:${post.id}:${post.status}:${post.moderated_at}`,
        category: 'moderation',
        recipientIds: [post.author_id],
        title: approved ? 'Работа одобрена' : 'Работа отклонена',
        body: approved ? 'Ваша публикация появилась в общей ленте' : 'Публикацию не пропустили модераторы',
        data: { type: 'post_moderated', postId: post.id },
      };
    }

    case 'listing_moderated': {
      requireStaff(caller);
      const { data: listing } = await admin
        .from('marketplace_listings')
        .select('id, seller_id, title, status, moderated_at')
        .eq('id', id)
        .single();
      if (!listing) throw new HttpError(404, 'Объявление не найдено');
      if (listing.status === 'pending') throw new HttpError(409, 'Объявление ещё не проверено');
      const approved = listing.status === 'approved';
      return {
        dedupKey: `listing_moderated:${listing.id}:${listing.status}:${listing.moderated_at}`,
        category: 'moderation',
        recipientIds: [listing.seller_id],
        title: approved ? 'Объявление одобрено' : 'Объявление отклонено',
        body: approved
          ? `«${listing.title}» опубликовано в разделе «Продажа»`
          : `«${listing.title}» не прошло проверку`,
        data: { type: 'listing_moderated', listingId: listing.id },
      };
    }

    case 'announcement': {
      requireStaff(caller);
      const { data: announcement } = await admin
        .from('announcements')
        .select('id, title, body, audience, group_id')
        .eq('id', id)
        .single();
      if (!announcement) throw new HttpError(404, 'Объявление не найдено');
      return {
        dedupKey: `announcement:${announcement.id}`,
        category: 'announcements',
        recipientIds: await resolveAudience(admin, announcement.audience, announcement.group_id),
        title: announcement.title,
        body: truncate(announcement.body),
        data: { type: 'announcement' },
      };
    }

    case 'support_message': {
      const { data: message } = await admin
        .from('support_messages')
        .select('id, ticket_id, author_id, body, ticket:ticket_id ( author_id, subject )')
        .eq('id', id)
        .single();
      if (!message) throw new HttpError(404, 'Сообщение не найдено');
      if (message.author_id !== caller.id) throw new HttpError(403, 'Это не ваше сообщение');
      const ticket = message.ticket as unknown as { author_id: string; subject: string } | null;
      if (!ticket) return null;
      const data = { type: 'support_ticket', ticketId: message.ticket_id };

      // Написал автор обращения — сообщаем всем сотрудникам.
      if (ticket.author_id === caller.id) {
        const { data: staff, error } = await admin.from('profiles').select('id').in('role', ['staff', 'admin']);
        if (error) throw error;
        return {
          dedupKey: `support_message:${message.id}`,
          category: 'support',
          recipientIds: (staff ?? []).map((row: { id: string }) => row.id),
          title: `Обращение от ${caller.full_name}: ${ticket.subject}`,
          body: truncate(message.body),
          data,
        };
      }

      // Иначе отвечает сотрудник (RLS не даст написать в чужое обращение
      // никому другому) — сообщаем автору.
      requireStaff(caller);
      return {
        dedupKey: `support_message:${message.id}`,
        category: 'support',
        recipientIds: [ticket.author_id],
        title: `Ответ по обращению «${ticket.subject}»`,
        body: truncate(message.body),
        data,
      };
    }

    default:
      throw new HttpError(400, `Неизвестное событие: ${event}`);
  }
}

async function resolveAudience(admin: SupabaseClient, audience: string, groupId: string | null): Promise<string[]> {
  if (audience === 'group') {
    if (!groupId) return [];
    const { data, error } = await admin.from('group_members').select('student_id').eq('group_id', groupId);
    if (error) throw error;
    const studentIds = (data ?? []).map((row: { student_id: string }) => row.student_id);
    if (studentIds.length === 0) return [];
    // Объявление группы получают и родители её учеников.
    const { data: links, error: linksError } = await admin
      .from('parent_children')
      .select('parent_id')
      .in('student_id', studentIds);
    if (linksError) throw linksError;
    const parentIds = (links ?? []).map((row: { parent_id: string }) => row.parent_id);
    return [...new Set([...studentIds, ...parentIds])];
  }

  let query = admin.from('profiles').select('id');
  if (audience === 'students') query = query.eq('role', 'student');
  if (audience === 'staff') query = query.in('role', ['staff', 'admin']);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: { id: string }) => row.id);
}

// Токены получателей, у которых категория уведомления включена.
async function resolveTokens(admin: SupabaseClient, userIds: string[], category: NotificationCategory) {
  const { data: allowed, error: profilesError } = await admin
    .from('profiles')
    .select('id')
    .in('id', userIds)
    .eq(CATEGORY_COLUMNS[category], true);
  if (profilesError) throw profilesError;

  const allowedIds = (allowed ?? []).map((p: { id: string }) => p.id);
  if (allowedIds.length === 0) return [];

  const { data: tokens, error: tokensError } = await admin
    .from('push_tokens')
    .select('token')
    .in('user_id', allowedIds);
  if (tokensError) throw tokensError;
  return (tokens ?? []).map((t: { token: string }) => t.token);
}

async function sendToExpo(admin: SupabaseClient, tokens: string[], message: PushMessage) {
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  let sent = 0;
  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    const messages = chunk.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(messages),
    });

    if (response.ok) {
      sent += chunk.length;
      // Токены удалённых приложений Expo помечает DeviceNotRegistered — удаляем их.
      try {
        const result = (await response.json()) as { data?: { status?: string; details?: { error?: string } }[] };
        const dead = (result.data ?? [])
          .map((ticket, index) => (ticket?.details?.error === 'DeviceNotRegistered' ? chunk[index] : null))
          .filter((t): t is string => !!t);
        if (dead.length > 0) await admin.from('push_tokens').delete().in('token', dead);
      } catch {
        // Ответ без подробностей — ничего не чистим.
      }
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const request = (await req.json()) as RequestBody;
    if (!request || typeof request.event !== 'string' || typeof request.id !== 'string' || !request.id) {
      return json(400, { error: 'event и id обязательны' });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const caller = await getCaller(admin, req);
    const message = await buildMessage(admin, caller, request);

    // Себе уведомления не шлём (свой комментарий, модерация своей работы).
    let recipientIds = message ? [...new Set(message.recipientIds)].filter((id) => id !== caller.id) : [];
    // Тем, кто заблокировал отправителя, его уведомления не приходят.
    // Уведомления от сотрудников (модерация, объявления, ответы в «Помощи»)
    // блокировкой не отключаются.
    if (recipientIds.length > 0 && caller.role !== 'staff' && caller.role !== 'admin') {
      const { data: blocks } = await admin
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocked_id', caller.id)
        .in('blocker_id', recipientIds);
      const blockedBy = new Set((blocks ?? []).map((b: { blocker_id: string }) => b.blocker_id));
      recipientIds = recipientIds.filter((id) => !blockedBy.has(id));
    }
    if (!message || recipientIds.length === 0) {
      return json(200, { recipients: 0, sent: 0 });
    }

    // Занимаем событие до отправки: повторный вызов с тем же событием
    // (случайный или намеренный спам) ничего не разошлёт.
    const { error: dedupError } = await admin.from('push_events').insert({ key: message.dedupKey });
    if (dedupError) {
      if (dedupError.code === '23505') {
        return json(200, { recipients: 0, sent: 0, duplicate: true });
      }
      throw dedupError;
    }

    const tokens = await resolveTokens(admin, recipientIds, message.category);
    const sent = await sendToExpo(admin, tokens, message);
    return json(200, { recipients: tokens.length, sent });
  } catch (e) {
    if (e instanceof HttpError) {
      return json(e.status, { error: e.message });
    }
    // Подробности ошибки — только в журнал функции, не в ответ приложению.
    console.error(e);
    return json(500, { error: 'Internal error' });
  }
});
