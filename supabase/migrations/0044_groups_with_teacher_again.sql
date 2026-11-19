-- Возврат закрепления групп за преподавателями (отмена 0043).
--
-- Группу снова ведёт только её преподаватель (groups.teacher_id) и
-- администратор: посещаемость, расписание, переносы. При замене
-- преподавателя администратор меняет его в карточке группы.
-- Чат родителя — снова с преподавателем групп ребёнка или администратором.
--
-- Выполнять после 0043.

create or replace function public.can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (select 1 from public.groups where id = p_group_id and teacher_id = auth.uid());
$$;

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
