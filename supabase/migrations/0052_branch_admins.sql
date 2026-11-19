-- Администратор филиала: преподаватель (роль staff), которому администратор
-- школы поручил вести один филиал. В группах своего филиала он может то же,
-- что администратор: списки детей и коды (в т.ч. массовая загрузка), состав
-- групп, расписание, посещаемость, преподаватель группы. Роли, проверку
-- публикаций, другие филиалы и создание/удаление групп — не может.

create table if not exists public.branch_admins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

alter table public.branch_admins enable row level security;

create policy "branch_admins_select" on public.branch_admins
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Пишет только set_branch_admin (security definer).

-- Ведёт ли текущий пользователь филиал этой группы.
create or replace function public.is_branch_admin_of_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() and exists (
    select 1
    from public.groups g
    join public.branch_admins ba on ba.branch_id = g.branch_id
    where g.id = p_group_id and ba.user_id = auth.uid()
  );
$$;

create or replace function public.is_branch_admin_of(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() and exists (
    select 1 from public.branch_admins where branch_id = p_branch_id and user_id = auth.uid()
  );
$$;

revoke execute on function public.is_branch_admin_of_group(uuid) from public, anon;
revoke execute on function public.is_branch_admin_of(uuid) from public, anon;
grant execute on function public.is_branch_admin_of_group(uuid) to authenticated;
grant execute on function public.is_branch_admin_of(uuid) to authenticated;

-- Через can_manage_group права получают: school_roster, lessons,
-- lesson_changes, regenerate_roster_code, mark_attendance, group_face_passes.
create or replace function public.can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (select 1 from public.groups where id = p_group_id and teacher_id = auth.uid())
    or public.is_branch_admin_of_group(p_group_id);
$$;

-- Состав групп своего филиала.
create policy "group_members_write_branch_admin" on public.group_members
  for all to authenticated
  using (public.is_branch_admin_of_group(group_id))
  with check (public.is_branch_admin_of_group(group_id));

-- Преподаватель группы и её название — только внутри своего филиала
-- (перенести группу в чужой филиал нельзя).
create policy "groups_update_branch_admin" on public.groups
  for update to authenticated
  using (public.is_branch_admin_of(branch_id))
  with check (public.is_branch_admin_of(branch_id));

-- Телефоны учеников своего филиала (как у преподавателя своей группы).
drop policy if exists "profile_private_select" on public.profile_private;
create policy "profile_private_select" on public.profile_private
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where gm.student_id = profile_private.user_id
        and (g.teacher_id = auth.uid() or public.is_branch_admin_of(g.branch_id))
    )
  );

-- Назначить (или снять, p_branch_id = null) администратора филиала.
-- Только администратор школы и только для сотрудника с ролью staff.
create or replace function public.set_branch_admin(p_user_id uuid, p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege: only administrators can assign branch administrators';
  end if;
  if p_branch_id is not null and not exists (
    select 1 from public.profiles where id = p_user_id and role::text = 'staff'
  ) then
    raise exception 'branch administrator must be a teacher (staff)';
  end if;
  delete from public.branch_admins where user_id = p_user_id;
  if p_branch_id is not null then
    insert into public.branch_admins (user_id, branch_id) values (p_user_id, p_branch_id);
  end if;
end;
$$;

revoke execute on function public.set_branch_admin(uuid, uuid) from public, anon;
grant execute on function public.set_branch_admin(uuid, uuid) to authenticated;

-- Если сотрудника перевели в другую роль, права филиала снимаются.
create or replace function public.drop_branch_admin_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role::text <> 'staff' then
    delete from public.branch_admins where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_drop_branch_admin on public.profiles;
create trigger profiles_drop_branch_admin
  after update of role on public.profiles
  for each row when (old.role is distinct from new.role)
  execute procedure public.drop_branch_admin_on_role_change();
