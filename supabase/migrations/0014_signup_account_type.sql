-- Регистрация «как Ученик» или «как Родитель» с выбором группы.
--
-- Ученик при регистрации сразу попадает в выбранную группу (group_members),
-- поэтому его расписание заполняется автоматически.
--
-- Родитель выбирает группу своего ребёнка и видит её расписание и сообщения
-- группы. Доступ к данным конкретного ребёнка (прогресс, галерея, оплаты)
-- по-прежнему открывает только сотрудник, привязав родителя к ребёнку
-- (parent_children из 0012). Выбор группы такого доступа не даёт.
--
-- Тип аккаунта приходит из raw_user_meta_data, которые присылает клиент,
-- поэтому триггер принимает только 'student' и 'parent': стать сотрудником
-- при регистрации по-прежнему нельзя.
--
-- Новое значение enum нельзя использовать в той же транзакции, где оно
-- добавлено, а SQL Editor выполняет скрипт одной транзакцией. Поэтому ниже
-- роль сравнивается как текст, а в enum приводится только внутри функции
-- (это происходит при регистрации, уже после этой миграции).

alter type public.user_role add value if not exists 'parent';

-- =========================================================
-- ГРУППА, ВЫБРАННАЯ РОДИТЕЛЕМ
-- =========================================================

create table public.parent_groups (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, group_id)
);

create index parent_groups_group_idx on public.parent_groups (group_id);

alter table public.parent_groups enable row level security;

create policy "parent_groups_select_own_or_staff" on public.parent_groups
  for select using (parent_id = auth.uid() or public.is_staff());

create policy "parent_groups_write_staff" on public.parent_groups
  for all using (public.is_staff()) with check (public.is_staff());

-- Сообщения для группы видит и родитель, выбравший эту группу.
create policy "announcements_select_parent_group" on public.announcements
  for select using (
    audience = 'group'
    and exists (
      select 1 from public.parent_groups pg
      join public.profiles p on p.id = pg.parent_id
      where pg.parent_id = auth.uid()
        and pg.group_id = announcements.group_id
        and p.role::text = 'parent'
    )
  );

-- =========================================================
-- СПИСОК ГРУПП ДЛЯ ЭКРАНА РЕГИСТРАЦИИ
-- Пользователь ещё не вошёл, а таблица groups открыта только вошедшим,
-- поэтому отдаём лишь id и название через функцию.
-- =========================================================

create function public.list_signup_groups()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name from public.groups g order by g.name;
$$;

revoke execute on function public.list_signup_groups() from public;
grant execute on function public.list_signup_groups() to anon, authenticated;

-- =========================================================
-- СОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_parent boolean := coalesce(new.raw_user_meta_data ->> 'account_type', '') = 'parent';
  v_group_id uuid;
begin
  -- Неверный или несуществующий id группы не должен ломать регистрацию:
  -- человек просто окажется без группы, и её назначит сотрудник.
  begin
    v_group_id := nullif(new.raw_user_meta_data ->> 'group_id', '')::uuid;
  exception when invalid_text_representation then
    v_group_id := null;
  end;
  if v_group_id is not null and not exists (select 1 from public.groups where id = v_group_id) then
    v_group_id := null;
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when v_is_parent then 'parent'::public.user_role else 'student'::public.user_role end
  );

  if v_group_id is not null then
    if v_is_parent then
      insert into public.parent_groups (parent_id, group_id) values (new.id, v_group_id);
    else
      insert into public.group_members (group_id, student_id) values (v_group_id, new.id);
    end if;
  end if;

  return new;
end;
$$;
