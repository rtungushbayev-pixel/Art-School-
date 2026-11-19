-- Чат родителя с преподавателем.
--
-- Один чат на тройку «родитель — преподаватель — ребёнок». Начать его можно
-- только если ребёнок занимается в группе этого преподавателя (или
-- преподаватель — администратор). Сообщения видят только двое участников.
-- О новом сообщении собеседник получает пуш (send-push: chat_message).
--
-- Выполнять после 0033.

create table public.parent_chats (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  parent_read_at timestamptz not null default now(),
  teacher_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (parent_id, teacher_id, student_id)
);

create index parent_chats_parent_idx on public.parent_chats (parent_id, last_message_at desc);
create index parent_chats_teacher_idx on public.parent_chats (teacher_id, last_message_at desc);

create table public.parent_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.parent_chats (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index parent_chat_messages_chat_idx on public.parent_chat_messages (chat_id, created_at);

alter table public.parent_chats enable row level security;
alter table public.parent_chat_messages enable row level security;

create or replace function public.is_chat_member(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.parent_chats
    where id = p_chat_id and auth.uid() in (parent_id, teacher_id)
  );
$$;

revoke execute on function public.is_chat_member(uuid) from public, anon;
grant execute on function public.is_chat_member(uuid) to authenticated;

-- Чаты и сообщения видят только участники. Создаются чаты через
-- start_parent_chat, отметки «прочитано» — через mark_chat_read.
create policy "parent_chats_select" on public.parent_chats
  for select to authenticated using (auth.uid() in (parent_id, teacher_id));

create policy "parent_chat_messages_select" on public.parent_chat_messages
  for select to authenticated using (public.is_chat_member(chat_id));

create policy "parent_chat_messages_insert" on public.parent_chat_messages
  for insert to authenticated with check (author_id = auth.uid() and public.is_chat_member(chat_id));

-- Время — серверное; не больше 60 сообщений в час от одного человека.
create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.author_id := auth.uid();
  new.body := trim(new.body);
  new.created_at := now();
  if (
    select count(*) from public.parent_chat_messages
    where author_id = new.author_id and created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'rate_limited';
  end if;
  update public.parent_chats set
    last_message_at = new.created_at,
    parent_read_at = case when parent_id = new.author_id then new.created_at else parent_read_at end,
    teacher_read_at = case when teacher_id = new.author_id then new.created_at else teacher_read_at end
  where id = new.chat_id;
  return new;
end;
$$;

create trigger parent_chat_messages_prepare
  before insert on public.parent_chat_messages
  for each row execute function public.prepare_chat_message();

-- Найти или создать чат. Родитель пишет преподавателю своего ребёнка;
-- преподаватель — родителю ученика своей группы.
create or replace function public.start_parent_chat(p_parent_id uuid, p_teacher_id uuid, p_student_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or auth.uid() not in (p_parent_id, p_teacher_id) then
    raise exception 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.parent_children where parent_id = p_parent_id and student_id = p_student_id
  ) then
    raise exception 'not_parent_of_student';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_teacher_id and role::text = 'admin'
  ) and not exists (
    select 1 from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.student_id = p_student_id and g.teacher_id = p_teacher_id
  ) then
    raise exception 'not_teacher_of_student';
  end if;
  insert into public.parent_chats (parent_id, teacher_id, student_id)
  values (p_parent_id, p_teacher_id, p_student_id)
  on conflict (parent_id, teacher_id, student_id) do update set parent_id = excluded.parent_id
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.start_parent_chat(uuid, uuid, uuid) from public, anon;
grant execute on function public.start_parent_chat(uuid, uuid, uuid) to authenticated;

create or replace function public.mark_chat_read(p_chat_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.parent_chats set
    parent_read_at = case when parent_id = auth.uid() then now() else parent_read_at end,
    teacher_read_at = case when teacher_id = auth.uid() then now() else teacher_read_at end
  where id = p_chat_id and auth.uid() in (parent_id, teacher_id);
$$;

revoke execute on function public.mark_chat_read(uuid) from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;

-- Преподаватели ребёнка (для кнопки «Написать преподавателю» у родителя).
create or replace function public.child_teachers(p_student_id uuid)
returns table (teacher_id uuid, full_name text, avatar_url text, group_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.parent_children where parent_id = auth.uid() and student_id = p_student_id
  ) then
    raise exception 'insufficient_privilege';
  end if;
  return query
    select distinct on (g.teacher_id) g.teacher_id, p.full_name, p.avatar_url, g.name
    from public.group_members gm
    join public.groups g on g.id = gm.group_id and g.teacher_id is not null
    join public.profiles p on p.id = g.teacher_id
    where gm.student_id = p_student_id
    order by g.teacher_id, g.name;
end;
$$;

revoke execute on function public.child_teachers(uuid) from public, anon;
grant execute on function public.child_teachers(uuid) to authenticated;
