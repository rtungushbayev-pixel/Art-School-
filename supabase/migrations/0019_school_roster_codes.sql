-- Регистрация только по коду из школы (находки C-1, H-1, H-2 аудита безопасности).
--
-- Школа ведёт список учеников (school_roster): ФИО, группа и код, который
-- выдаётся ребёнку. Ученик при регистрации выбирает группу и вводит код:
-- если код существует, ещё не использован и группа совпадает, аккаунт
-- создаётся сразу, имя берётся из списка школы, ученик попадает в группу.
-- Родитель вводит код ребёнка и сразу привязывается к нему (родителей на
-- одного ребёнка — не больше 4, чтобы утёкший код не открыл доступ всем).
--
-- Сотрудник регистрируется по одноразовому приглашению (staff_invites),
-- которое создаёт другой сотрудник. Без кода зарегистрироваться нельзя.
--
-- Телефон обязателен при регистрации и хранится в profile_private (видят
-- только владелец и сотрудники).
--
-- Уже существующие аккаунты не затрагиваются.

-- =========================================================
-- СПИСОК УЧЕНИКОВ ШКОЛЫ
-- =========================================================

-- 10 случайных шестнадцатеричных символов вида A1B2C-3D4E5 (≈10^12 вариантов).
create function public.generate_roster_code()
returns text
language sql
volatile
set search_path = public
as $$
  select upper(substr(r, 1, 5) || '-' || substr(r, 6, 5))
  from (select replace(gen_random_uuid()::text, '-', '') as r) s;
$$;

create table public.school_roster (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 200),
  group_id uuid not null references public.groups (id) on delete restrict,
  code text not null unique default public.generate_roster_code(),
  -- аккаунт ученика, который зарегистрировался по этому коду
  student_id uuid unique references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index school_roster_group_idx on public.school_roster (group_id);

alter table public.school_roster enable row level security;

-- Список и коды видят и ведут только сотрудники.
create policy "school_roster_staff" on public.school_roster
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Родители, указавшие код ребёнка. Привязка к записи списка, а не к
-- аккаунту: родитель может зарегистрироваться раньше ребёнка.
create table public.parent_roster (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  roster_id uuid not null references public.school_roster (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, roster_id)
);

alter table public.parent_roster enable row level security;

create policy "parent_roster_select_own_or_staff" on public.parent_roster
  for select to authenticated using (parent_id = auth.uid() or public.is_staff());
-- Пишут только функции ниже (security definer).

-- Код вводят с любым регистром и пробелами.
create function public.normalize_roster_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create function public.find_roster_by_code(p_code text)
returns public.school_roster
language sql
stable
security definer
set search_path = public
as $$
  select * from public.school_roster
  where public.normalize_roster_code(code) = public.normalize_roster_code(p_code)
  limit 1;
$$;

revoke execute on function public.find_roster_by_code(text) from public, anon, authenticated;

-- Привязать родителя к записи списка; если ребёнок уже зарегистрирован —
-- сразу и к его аккаунту (parent_children из 0012, через неё работает доступ).
create function public.attach_parent_to_roster(p_parent_id uuid, p_roster public.school_roster)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.parent_roster where parent_id = p_parent_id and roster_id = p_roster.id) then
    return;
  end if;
  if (select count(*) from public.parent_roster where roster_id = p_roster.id) >= 4 then
    raise exception 'too_many_parents';
  end if;
  insert into public.parent_roster (parent_id, roster_id) values (p_parent_id, p_roster.id);
  if p_roster.student_id is not null then
    insert into public.parent_children (parent_id, student_id)
    values (p_parent_id, p_roster.student_id)
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function public.attach_parent_to_roster(uuid, public.school_roster) from public, anon, authenticated;

-- Когда ученик зарегистрировался по коду, родители, указавшие этот код
-- раньше, привязываются к его аккаунту.
create function public.link_parents_on_roster_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_id is not null and (old.student_id is distinct from new.student_id) then
    insert into public.parent_children (parent_id, student_id)
    select pr.parent_id, new.student_id from public.parent_roster pr where pr.roster_id = new.id
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger school_roster_link_parents
  after update of student_id on public.school_roster
  for each row execute procedure public.link_parents_on_roster_claim();

-- =========================================================
-- ПРОВЕРКА КОДА ДО РЕГИСТРАЦИИ (экран регистрации, без входа)
-- Отвечает только «подходит / не подходит», не раскрывая, что именно не так.
-- =========================================================

create function public.check_signup_code(p_account_type text, p_code text, p_group_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.school_roster;
begin
  if p_account_type = 'staff' then
    return exists (
      select 1 from public.staff_invites
      where public.normalize_roster_code(code) = public.normalize_roster_code(p_code)
        and used_by is null and expires_at > now()
    );
  end if;
  r := public.find_roster_by_code(p_code);
  if r.id is null then
    return false;
  end if;
  if p_account_type = 'parent' then
    return (select count(*) from public.parent_roster where roster_id = r.id) < 4;
  end if;
  return r.student_id is null and r.group_id = p_group_id;
end;
$$;

revoke execute on function public.check_signup_code(text, text, uuid) from public;
grant execute on function public.check_signup_code(text, text, uuid) to anon, authenticated;

-- Родитель в приложении: «+» в «Мои дети» → код ребёнка.
create function public.link_child_by_code(p_code text)
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
  r := public.find_roster_by_code(p_code);
  if r.id is null then
    return false;
  end if;
  perform public.attach_parent_to_roster(auth.uid(), r);
  return true;
end;
$$;

revoke execute on function public.link_child_by_code(text) from public, anon;
grant execute on function public.link_child_by_code(text) to authenticated;

-- Новый код для записи (если код ребёнка утёк). Только сотрудник.
create function public.regenerate_roster_code(p_roster_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := public.generate_roster_code();
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'insufficient_privilege';
  end if;
  update public.school_roster set code = v_code where id = p_roster_id;
  return v_code;
end;
$$;

revoke execute on function public.regenerate_roster_code(uuid) from public, anon;
grant execute on function public.regenerate_roster_code(uuid) to authenticated;

-- =========================================================
-- ПРИГЛАШЕНИЯ СОТРУДНИКОВ
-- =========================================================

create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.generate_roster_code(),
  note text check (note is null or length(note) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  -- приглашение действует неделю
  expires_at timestamptz not null default now() + interval '7 days'
);

alter table public.staff_invites enable row level security;

create policy "staff_invites_staff" on public.staff_invites
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create function public.create_staff_invite(p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'insufficient_privilege';
  end if;
  insert into public.staff_invites (note, created_by) values (left(p_note, 200), auth.uid())
  returning code into v_code;
  return v_code;
end;
$$;

revoke execute on function public.create_staff_invite(text) from public, anon;
grant execute on function public.create_staff_invite(text) to authenticated;

-- =========================================================
-- РЕГИСТРАЦИЯ
-- Ошибки с понятными кодами (invalid_student_code, invalid_child_code,
-- phone_required, too_many_parents) отменяют создание аккаунта целиком.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_is_parent boolean := coalesce(v_meta ->> 'account_type', '') = 'parent';
  v_phone text := regexp_replace(coalesce(v_meta ->> 'phone', ''), '[^0-9+]', '', 'g');
  v_group_id uuid;
  r public.school_roster;
  v_invite public.staff_invites;
begin
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 10 and 15 then
    raise exception 'phone_required';
  end if;

  if coalesce(v_meta ->> 'account_type', '') = 'staff' then
    select * into v_invite from public.staff_invites
    where public.normalize_roster_code(code) = public.normalize_roster_code(v_meta ->> 'code')
      and used_by is null and expires_at > now()
    for update;
    if v_invite.id is null then
      raise exception 'invalid_staff_code';
    end if;
    insert into public.profiles (id, full_name, role)
    values (new.id, left(trim(coalesce(v_meta ->> 'full_name', '')), 200), 'staff'::public.user_role);
    insert into public.profile_private (user_id, phone) values (new.id, v_phone);
    update public.staff_invites set used_by = new.id, used_at = now() where id = v_invite.id;
    return new;
  end if;

  r := public.find_roster_by_code(v_meta ->> 'code');

  if v_is_parent then
    if r.id is null then
      raise exception 'invalid_child_code';
    end if;
    insert into public.profiles (id, full_name, role)
    values (new.id, left(trim(coalesce(v_meta ->> 'full_name', '')), 200), 'parent'::public.user_role);
    insert into public.profile_private (user_id, phone) values (new.id, v_phone);
    perform public.attach_parent_to_roster(new.id, r);
  else
    begin
      v_group_id := nullif(v_meta ->> 'group_id', '')::uuid;
    exception when invalid_text_representation then
      v_group_id := null;
    end;
    -- Заблокировать строку списка, чтобы один код не забрали двое одновременно.
    if r.id is not null then
      select * into r from public.school_roster where id = r.id for update;
    end if;
    if r.id is null or r.student_id is not null or r.group_id is distinct from v_group_id then
      raise exception 'invalid_student_code';
    end if;
    -- Имя — из списка школы, а не то, что ввели при регистрации.
    insert into public.profiles (id, full_name, role)
    values (new.id, r.full_name, 'student'::public.user_role);
    insert into public.profile_private (user_id, phone) values (new.id, v_phone);
    insert into public.group_members (group_id, student_id) values (r.group_id, new.id)
    on conflict do nothing;
    update public.school_roster set student_id = new.id, claimed_at = now() where id = r.id;
  end if;

  return new;
end;
$$;

-- Телефон меняется в профиле; пустой или неправдоподобный сохранить нельзя.
alter table public.profile_private
  add constraint profile_private_phone_format
  check (phone is null or length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15) not valid;
