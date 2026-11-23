-- 0057: «История искусств» — лимит вопросов гиду и хранилище видео эпох.
--
-- 1. art_guide_usage — сколько вопросов человек задал гиду сегодня
--    (по времени Алматы). Только счётчик: тексты вопросов нигде не хранятся.
--    Читать и менять таблицу может только функция ask-guide (service role).
-- 2. art_guide_take — атомарно засчитывает один вопрос, если лимит не
--    исчерпан, и возвращает номер вопроса за день (или -1, если лимит).
-- 3. Bucket art-history — видео-экскурсии эпох (videos/{эпоха}.mp4).
--    Смотреть могут все вошедшие пользователи, загружает только школа
--    через панель Supabase.

create table if not exists public.art_guide_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.art_guide_usage enable row level security;
-- Политик нет: через API таблица недоступна никому, кроме service role.
revoke all on public.art_guide_usage from anon, authenticated;

create or replace function public.art_guide_take(p_user uuid, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Almaty')::date;
  v_count integer;
begin
  insert into public.art_guide_usage (user_id, day, count)
  values (p_user, v_day, 1)
  on conflict (user_id, day) do update
    set count = public.art_guide_usage.count + 1
    where public.art_guide_usage.count < p_limit
  returning count into v_count;

  -- Старые дни больше не нужны.
  delete from public.art_guide_usage where user_id = p_user and day < v_day - 7;

  return coalesce(v_count, -1);
end;
$$;

revoke all on function public.art_guide_take(uuid, integer) from public, anon, authenticated;
grant execute on function public.art_guide_take(uuid, integer) to service_role;

-- Видео эпох.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('art-history', 'art-history', true, 104857600, array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "art-history read" on storage.objects;
create policy "art-history read" on storage.objects
  for select to authenticated
  using (bucket_id = 'art-history');
