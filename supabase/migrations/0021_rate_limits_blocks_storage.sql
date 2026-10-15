-- Этап 2 плана безопасности: блокировка (M-2), защита от спама (M-3),
-- ограничения на файлы (M-6), подбор кодов детей.
-- Сотрудников ограничения частоты не касаются.

-- =========================================================
-- M-2. БЛОКИРОВКА ДЕЙСТВУЕТ И НА КОММЕНТАРИИ
-- Заблокированный не может комментировать работы того, кто его
-- заблокировал (и наоборот). Уведомления фильтрует функция send-push.
-- =========================================================

drop policy "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own" on public.post_comments
  for insert to authenticated with check (
    auth.uid() = author_id and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.status = 'approved'
        and not public.is_blocked_between(auth.uid(), p.author_id)
    )
  );

-- =========================================================
-- M-3. ОГРАНИЧЕНИЕ ЧАСТОТЫ
-- Без него можно было в цикле создавать комментарии, обращения и
-- приглашения и засыпать людей уведомлениями.
-- =========================================================

-- Сколько записей пользователь создал в таблице за последний интервал.
-- Имя таблицы и колонки приходят только из триггеров ниже, не от клиента.
create function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_column text := tg_argv[0];
  v_max int := tg_argv[1]::int;
  v_interval interval := tg_argv[2]::interval;
  v_count int;
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, v_column
  ) into v_count using auth.uid(), v_interval;
  if v_count >= v_max then
    raise exception 'rate_limited' using hint = 'Слишком часто. Попробуйте немного позже.';
  end if;
  return new;
end;
$$;

create trigger post_comments_rate_limit before insert on public.post_comments
  for each row execute procedure public.enforce_rate_limit('author_id', '15', '10 minutes');

create trigger posts_rate_limit before insert on public.posts
  for each row execute procedure public.enforce_rate_limit('author_id', '10', '1 hour');

create trigger marketplace_listings_rate_limit before insert on public.marketplace_listings
  for each row execute procedure public.enforce_rate_limit('seller_id', '5', '1 hour');

create trigger support_tickets_rate_limit before insert on public.support_tickets
  for each row execute procedure public.enforce_rate_limit('author_id', '5', '1 hour');

create trigger support_messages_rate_limit before insert on public.support_messages
  for each row execute procedure public.enforce_rate_limit('author_id', '30', '10 minutes');

create trigger friendships_rate_limit before insert on public.friendships
  for each row execute procedure public.enforce_rate_limit('requester_id', '30', '1 hour');

-- Подбор кода ребёнка родителем: не больше 10 попыток в час.
create table public.code_attempts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index code_attempts_user_idx on public.code_attempts (user_id, created_at);
alter table public.code_attempts enable row level security;
-- Политик нет: пишет и читает только функция ниже.

create or replace function public.link_child_by_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.school_roster;
begin
  if auth.uid() is null
     or not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'parent') then
    raise exception 'only parents can link children';
  end if;
  if (select count(*) from public.code_attempts
      where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited';
  end if;
  insert into public.code_attempts (user_id) values (auth.uid());
  r := public.find_roster_by_code(p_code);
  if r.id is null then
    return false;
  end if;
  perform public.attach_parent_to_roster(auth.uid(), r);
  return true;
end;
$$;

-- =========================================================
-- M-6. ФАЙЛЫ: ТОЛЬКО КАРТИНКИ И ОГРАНИЧЕННОГО РАЗМЕРА
-- =========================================================

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'avatars';

update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id in ('portfolio', 'marketplace', 'student-photos');
