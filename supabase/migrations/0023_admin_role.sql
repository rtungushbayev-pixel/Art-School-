-- Роли «Преподаватель» и «Администратор» (находка M-4 аудита).
--
-- Раньше любой сотрудник (staff) мог всё: менять роли, приглашать новых
-- сотрудников, видеть телефоны и коды всех детей, вести оплаты и группы.
-- Теперь:
--   staff  = Преподаватель: модерация, сообщения, «Помощь», прогресс и фото
--            учеников; группы, занятия и коды учеников — только своих групп
--            (где он указан преподавателем).
--   admin  = Администратор: всё, что умеет преподаватель, плюс роли,
--            приглашения сотрудников, все группы и коды, телефоны, оплаты.
--
-- Первого администратора назначают один раз в SQL Editor:
--   update public.profiles set role = 'admin' where id = '<uuid пользователя>';
-- Дальше администраторы приглашают преподавателей и других администраторов
-- кодами из приложения.

alter type public.user_role add value if not exists 'admin';

-- Сотрудник — преподаватель или администратор (все прежние проверки is_staff
-- продолжают работать для обоих).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('staff', 'admin')
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role::text = 'admin');
$$;

-- Преподаватель этой группы (или администратор).
create function public.can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (select 1 from public.groups where id = p_group_id and teacher_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.can_manage_group(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_manage_group(uuid) to authenticated;

-- =========================================================
-- РОЛИ МЕНЯЕТ ТОЛЬКО АДМИНИСТРАТОР
-- =========================================================

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'insufficient_privilege: role can only be changed by an administrator';
  end if;
  return new;
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege: only administrators can change roles';
  end if;
  -- Защита от случайной потери доступа: свою роль администратор не меняет.
  if p_user_id = auth.uid() then
    raise exception 'cannot change own role';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

-- =========================================================
-- ПРИГЛАШЕНИЯ СОТРУДНИКОВ — ТОЛЬКО АДМИНИСТРАТОР, С ВЫБОРОМ РОЛИ
-- =========================================================

alter table public.staff_invites
  add column role text not null default 'staff' check (role in ('staff', 'admin'));

drop policy "staff_invites_staff" on public.staff_invites;
create policy "staff_invites_admin" on public.staff_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop function public.create_staff_invite(text);
create function public.create_staff_invite(p_role text default 'staff', p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  if p_role not in ('staff', 'admin') then
    raise exception 'invalid role';
  end if;
  insert into public.staff_invites (role, note, created_by)
  values (p_role, left(p_note, 200), auth.uid())
  returning code into v_code;
  return v_code;
end;
$$;

revoke execute on function public.create_staff_invite(text, text) from public, anon;
grant execute on function public.create_staff_invite(text, text) to authenticated;

-- Регистрация по приглашению: роль берётся из приглашения.
-- (Остальная логика — как в 0019.)
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
    values (new.id, left(trim(coalesce(v_meta ->> 'full_name', '')), 200), v_invite.role::public.user_role);
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
    if r.id is not null then
      select * into r from public.school_roster where id = r.id for update;
    end if;
    if r.id is null or r.student_id is not null or r.group_id is distinct from v_group_id then
      raise exception 'invalid_student_code';
    end if;
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

-- =========================================================
-- ГРУППЫ, СОСТАВ, ЗАНЯТИЯ, КОДЫ: администратор — все, преподаватель — свои
-- =========================================================

drop policy "groups_write_staff" on public.groups;
create policy "groups_write_admin" on public.groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy "group_members_write_staff" on public.group_members;
create policy "group_members_write_manager" on public.group_members
  for all to authenticated using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));

drop policy "lessons_write_staff" on public.lessons;
create policy "lessons_write_manager" on public.lessons
  for all to authenticated using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));

drop policy "lesson_changes_write_staff" on public.lesson_changes;
create policy "lesson_changes_write_manager" on public.lesson_changes
  for all to authenticated using (
    exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_group(l.group_id))
  ) with check (
    exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_group(l.group_id))
  );

drop policy "school_roster_staff" on public.school_roster;
create policy "school_roster_manager" on public.school_roster
  for all to authenticated using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));

create or replace function public.regenerate_roster_code(p_roster_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := public.generate_roster_code();
begin
  if auth.uid() is null or not exists (
    select 1 from public.school_roster where id = p_roster_id and public.can_manage_group(group_id)
  ) then
    raise exception 'insufficient_privilege';
  end if;
  update public.school_roster set code = v_code where id = p_roster_id;
  return v_code;
end;
$$;

-- =========================================================
-- ТЕЛЕФОНЫ И ОПЛАТЫ
-- Телефон видят владелец, администратор и преподаватель группы ученика.
-- Оплаты ведёт и видит только администратор (и сам ученик — свои).
-- =========================================================

drop policy "profile_private_select_own_or_staff" on public.profile_private;
create policy "profile_private_select" on public.profile_private
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where gm.student_id = profile_private.user_id and g.teacher_id = auth.uid()
    )
  );

drop policy "billing_entries_select_own_or_staff" on public.billing_entries;
create policy "billing_entries_select_own_or_admin" on public.billing_entries
  for select to authenticated using (student_id = auth.uid() or public.is_admin());

drop policy "billing_entries_write_staff" on public.billing_entries;
create policy "billing_entries_write_admin" on public.billing_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
