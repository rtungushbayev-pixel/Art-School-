-- Защита push-уведомлений.
--
-- 1) Push-токены раньше лежали в profiles.push_token, а профили по RLS
--    читают все авторизованные пользователи — любой мог выгрузить токены
--    всей школы и слать уведомления напрямую в Expo Push API. Токены
--    переезжают в отдельную таблицу, недоступную клиенту: записать свой
--    токен можно только через RPC, прочитать — только Edge Function
--    send-push (service role).
--
-- 2) send-push раньше принимала от клиента получателей и текст как есть.
--    Теперь клиент передаёт только событие («комментарий X», «объявление Y»),
--    а функция сама проверяет права и собирает получателей/текст. Таблица
--    push_events не даёт разослать уведомление по одному событию повторно.

-- =========================================================
-- PUSH_TOKENS
-- =========================================================

create table public.push_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- один физический токен — одно устройство — один пользователь
  token text not null unique,
  updated_at timestamptz not null default now()
);

-- RLS без политик + отозванные права: клиент не может ни читать, ни писать
-- таблицу напрямую. Service role (Edge Function) обходит RLS.
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

-- Переносим существующие токены. Если один токен оказался у нескольких
-- профилей (общее устройство), оставляем самый свежий профиль.
insert into public.push_tokens (user_id, token)
select distinct on (push_token) id, push_token
from public.profiles
where push_token is not null
order by push_token, updated_at desc;

alter table public.profiles drop column push_token;

create function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_token is null or length(p_token) = 0 or length(p_token) > 512 then
    raise exception 'invalid push token';
  end if;

  -- Устройство перешло к другому аккаунту — прошлый владелец больше не
  -- должен получать на него уведомления.
  delete from public.push_tokens where token = p_token and user_id <> auth.uid();

  insert into public.push_tokens (user_id, token)
  values (auth.uid(), p_token)
  on conflict (user_id) do update set token = excluded.token, updated_at = now();
end;
$$;

create function public.clear_push_token()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens where user_id = auth.uid();
end;
$$;

revoke execute on function public.register_push_token(text) from public, anon;
revoke execute on function public.clear_push_token() from public, anon;
grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.clear_push_token() to authenticated;

-- =========================================================
-- PUSH_EVENTS: защита от повторной рассылки по одному событию
-- =========================================================

create table public.push_events (
  key text primary key,
  created_at timestamptz not null default now()
);

alter table public.push_events enable row level security;
revoke all on public.push_events from anon, authenticated;
