// Supabase Edge Function: send-push
//
// Принимает список ID пользователей и текст уведомления, находит их
// Expo push-токены (profiles.push_token) через service role (в обход RLS,
// чтобы клиент никогда не читал чужие токены напрямую) и отправляет пуши
// через Expo Push API.
//
// Деплой: supabase functions deploy send-push
// (SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY передаются в функцию автоматически)

import { createClient } from 'npm:@supabase/supabase-js@2';

interface RequestBody {
  userIds: string[];
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
    const { userIds, title, body, data } = (await req.json()) as RequestBody;

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
      return new Response(JSON.stringify({ error: 'userIds, title и body обязательны' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);

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
