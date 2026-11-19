-- Группы без закреплённого преподавателя.
--
-- Преподаватели меняются (болезнь, замены), поэтому группа больше не
-- привязана к одному преподавателю: любой сотрудник школы может вести любую
-- группу — отмечать посещаемость, менять расписание и переносить занятия,
-- выдавать коды из списка группы. Состав групп по-прежнему меняет только
-- администратор (group_members_write_admin). Телефоны учеников видит только
-- администратор. Колонка groups.teacher_id остаётся, но не используется.
--
-- Родитель может написать любому преподавателю школы о своём ребёнке.
--
-- Выполнять после 0042.

create or replace function public.can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() and exists (select 1 from public.groups where id = p_group_id);
$$;

-- Чат: родитель ребёнка — любой сотрудник школы.
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
    select 1 from public.profiles where id = p_teacher_id and role::text in ('staff', 'admin')
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

-- Кому родитель может написать: все преподаватели школы (без администраторов).
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
    select p.id, p.full_name, p.avatar_url, null::text
    from public.profiles p
    where p.role::text = 'staff'
    order by p.full_name;
end;
$$;
