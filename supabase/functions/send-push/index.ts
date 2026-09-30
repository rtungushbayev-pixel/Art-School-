// Supabase Edge Function: send-push
//
// Принимает список ID пользователей и текст уведомления, находит их
// Expo push-токены (profiles.push_token) через service role (в обход RLS,
// чтобы клиент никогда не читал чужие токены напрямую) и отправляет пуши
// через Expo Push API. Получатели, отключившие категорию уведомления в
// настройках (profiles.notify_*), пропускаются.
//
// Деплой: supabase functions deploy send-push
// (SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY передаются в функцию автоматически)

import { createClient } from 'npm:@supabase/supabase-js@2';

type NotificationCategory = 'announcements' | 'comments' | 'moderation';

// Категория → колонка профиля с настройкой получателя.
const CATEGORY_COLUMNS: Record<NotificationCategory, string> = {
  announcements: 'notify_announcements',
  comments: 'notify_comments',
  moderation: 'notify_moderation',
};

interface RequestBody {
  userIds: string[];
  // Необязательна для совместимости со старыми версиями приложения, которые
  // её не передают: без категории настройки получателей не учитываются.
  category?: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const { userIds, category, title, body, data } = (await req.json()) as RequestBody;

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
      return new Response(JSON.stringify({ error: 'userIds, title и body обязательны' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    if (category !== undefined && !Object.hasOwn(CATEGORY_COLUMNS, category)) {
      return new Response(JSON.stringify({ error: `Неизвестная категория: ${category}` }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = supabase
      .from('profiles')
      .select('push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);
    if (category) {
      query = query.eq(CATEGORY_COLUMNS[category], true);
    }
    const { data: profiles, error } = await query;

    if (error) throw error;

    const tokens = [...new Set((profiles ?? []).map((p: { push_token: string }) => p.push_token))];

    let sent = 0;
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const messages = chunk.map((to) => ({ to, title, body, data, sound: 'default' }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        sent += chunk.length;
      }
    }

    return new Response(JSON.stringify({ recipients: tokens.length, sent }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
});
