-- 0061: героя можно сменить не больше 3 раз за календарный год.
--
-- Первый выбор героя сменой не считается. Счёт обнуляется 1 января
-- (по Алматы, UTC+5). Сотрудники и сервер могут менять героя без ограничений.
-- Опыт, звёзды и огонёк не зависят от героя и при смене сохраняются.
--
-- Миграцию можно запускать повторно. Выполнять после 0060.

create table if not exists public.hero_changes (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  from_hero text,
  to_hero text not null,
  changed_at timestamptz not null default now()
);

create index if not exists hero_changes_student_idx on public.hero_changes (student_id, changed_at desc);

alter table public.hero_changes enable row level security;

drop policy if exists hero_changes_select_own on public.hero_changes;
create policy hero_changes_select_own on public.hero_changes
  for select to authenticated
  using (student_id = auth.uid() or public.is_staff());

-- Записи добавляет только триггер ниже.
revoke insert, update, delete on public.hero_changes from anon, authenticated;

-- Сколько смен уже было в этом году (по Алматы).
create or replace function public.hero_changes_this_year(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.hero_changes
   where student_id = p_student_id
     and changed_at >= (make_date(extract(year from public.school_today())::int, 1, 1)::timestamp - interval '5 hours') at time zone 'UTC';
$$;

revoke execute on function public.hero_changes_this_year(uuid) from public, anon, authenticated;

-- Для приложения: сколько смен осталось у меня в этом году.
create or replace function public.hero_changes_left()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, 3 - public.hero_changes_this_year(auth.uid()));
$$;

revoke execute on function public.hero_changes_left() from public, anon;
grant execute on function public.hero_changes_left() to authenticated;

create or replace function public.enforce_hero_change_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Первый выбор, снятие героя и повторное сохранение того же — не смена.
  if old.hero_id is null or new.hero_id is null or new.hero_id is not distinct from old.hero_id then
    return new;
  end if;
  if auth.uid() is not null and not public.is_staff()
     and public.hero_changes_this_year(new.id) >= 3 then
    raise exception 'Героя можно сменить не больше 3 раз в год' using errcode = '42501';
  end if;
  insert into public.hero_changes (student_id, from_hero, to_hero) values (new.id, old.hero_id, new.hero_id);
  return new;
end;
$$;

revoke execute on function public.enforce_hero_change_limit() from public, anon, authenticated;

drop trigger if exists profiles_enforce_hero_change_limit on public.profiles;
create trigger profiles_enforce_hero_change_limit
  before update of hero_id on public.profiles
  for each row execute function public.enforce_hero_change_limit();
