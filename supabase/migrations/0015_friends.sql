-- Друзья: ученики и преподаватели находят друг друга, отправляют приглашения
-- в друзья и могут заблокировать человека.
--
-- friendships — одна строка на пару людей: кто пригласил, кого, и принято ли
-- приглашение. Принять приглашение может только тот, кого пригласили;
-- удалить строку (отклонить, отменить, удалить из друзей) — любой из двоих.
--
-- user_blocks — кого человек заблокировал. Заблокированный не может
-- отправить приглашение, а существующая дружба при блокировке удаляется.
-- Список блокировок виден только тому, кто блокировал.

create type friendship_status as enum ('pending', 'accepted');

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Одна пара — одна строка, в какую бы сторону ни было приглашение.
create unique index friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);
create index friendships_addressee_idx on public.friendships (addressee_id);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Друзей заводят ученики и сотрудники (родители — нет).
create function public.can_have_friends(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = p_user_id and role::text in ('student', 'staff')
  );
$$;

create function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- Новое приглашение: всегда «ожидает», без блокировок между людьми.
-- Изменение: только принять (pending → accepted), и только адресатом.
create function public.check_friendship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.accepted_at := null;
    if public.is_blocked_between(new.requester_id, new.addressee_id) then
      raise exception 'friend_request_blocked';
    end if;
    if not public.can_have_friends(new.requester_id) or not public.can_have_friends(new.addressee_id) then
      raise exception 'friends_not_available_for_role';
    end if;
  else
    if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
      raise exception 'cannot change friendship participants';
    end if;
    if new.status = 'accepted' and old.status = 'pending' then
      new.accepted_at := now();
    elsif new.status <> old.status then
      raise exception 'invalid friendship status change';
    end if;
  end if;
  return new;
end;
$$;

create trigger friendships_check_change
  before insert or update on public.friendships
  for each row execute procedure public.check_friendship_change();

-- Блокировка сразу убирает дружбу и приглашения между людьми.
create function public.remove_friendship_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

create trigger user_blocks_remove_friendship
  after insert on public.user_blocks
  for each row execute procedure public.remove_friendship_on_block();

alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;

create policy "friendships_select_own" on public.friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_insert_own" on public.friendships
  for insert with check (requester_id = auth.uid());

create policy "friendships_accept_addressee" on public.friendships
  for update using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());

create policy "friendships_delete_own" on public.friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "user_blocks_select_own" on public.user_blocks
  for select using (blocker_id = auth.uid());

create policy "user_blocks_insert_own" on public.user_blocks
  for insert with check (blocker_id = auth.uid());

create policy "user_blocks_delete_own" on public.user_blocks
  for delete using (blocker_id = auth.uid());
