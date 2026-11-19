-- Календарь выставок, конкурсов и мастер-классов с записью участников.
--
-- Сотрудники создают события. Ученик записывается сам, родитель — своих
-- детей. Запись закрывается после срока или когда мест нет. Список
-- участников видят сотрудники; ученик и родитель видят только свои записи.
--
-- Выполнять после 0034.

create table public.school_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  kind text not null default 'exhibition' check (kind in ('exhibition', 'competition', 'masterclass', 'other')),
  description text check (description is null or length(description) <= 4000),
  location text check (location is null or length(location) <= 300),
  starts_on date not null,
  ends_on date,
  signup_until date,
  max_participants int check (max_participants is null or max_participants > 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index school_events_starts_idx on public.school_events (starts_on);

create table public.event_registrations (
  event_id uuid not null references public.school_events (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  registered_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, student_id)
);

alter table public.school_events enable row level security;
alter table public.event_registrations enable row level security;

create policy "school_events_select" on public.school_events
  for select to authenticated using (true);
create policy "school_events_write_staff" on public.school_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "event_registrations_select" on public.event_registrations
  for select to authenticated using (
    student_id = auth.uid() or public.is_parent_of(student_id) or public.is_staff()
  );
create policy "event_registrations_insert" on public.event_registrations
  for insert to authenticated with check (
    (student_id = auth.uid() or public.is_parent_of(student_id) or public.is_staff())
    and exists (select 1 from public.profiles where id = student_id and role::text = 'student')
  );
create policy "event_registrations_delete" on public.event_registrations
  for delete to authenticated using (
    student_id = auth.uid() or public.is_parent_of(student_id) or public.is_staff()
  );

-- Срок записи и число мест проверяет сервер (сотрудник может записать и после срока).
create or replace function public.check_event_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.school_events;
begin
  select * into v_event from public.school_events where id = new.event_id for update;
  if v_event.id is null then
    raise exception 'event not found';
  end if;
  new.registered_by := auth.uid();
  new.created_at := now();
  if public.is_staff() then
    return new;
  end if;
  if coalesce(v_event.signup_until, v_event.starts_on) < (now() at time zone 'Asia/Almaty')::date then
    raise exception 'signup_closed';
  end if;
  if v_event.max_participants is not null and (
    select count(*) from public.event_registrations where event_id = new.event_id
  ) >= v_event.max_participants then
    raise exception 'event_full';
  end if;
  return new;
end;
$$;

create trigger event_registrations_check
  before insert on public.event_registrations
  for each row execute function public.check_event_registration();

-- Число записавшихся видно всем (без имён).
create or replace function public.event_participant_counts(p_event_ids uuid[])
returns table (event_id uuid, participants bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.event_id, count(*) from public.event_registrations r
  where r.event_id = any(p_event_ids)
  group by r.event_id;
$$;

revoke execute on function public.event_participant_counts(uuid[]) from public, anon;
grant execute on function public.event_participant_counts(uuid[]) to authenticated;
