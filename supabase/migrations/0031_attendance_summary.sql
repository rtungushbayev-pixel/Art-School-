-- Сводка посещаемости для администратора: по филиалам, группам и ученикам.
--
-- У группы появляется филиал (выбирает администратор в карточке группы).
--
-- Выполнять после 0030.

alter table public.groups
  add column if not exists branch_id uuid references public.branches (id) on delete set null;

create index if not exists groups_branch_idx on public.groups (branch_id);

-- Отметки за период, сгруппированные по ученику в группе.
create or replace function public.attendance_summary(p_from date, p_to date)
returns table (
  branch_id uuid,
  branch_name text,
  group_id uuid,
  group_name text,
  student_id uuid,
  student_name text,
  present bigint,
  late bigint,
  absent bigint,
  excused bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  return query
    select
      g.branch_id,
      coalesce(b.name, '') as branch_name,
      g.id as group_id,
      g.name as group_name,
      a.student_id,
      coalesce(p.full_name, '') as student_name,
      count(*) filter (where a.status = 'present') as present,
      count(*) filter (where a.status = 'late') as late,
      count(*) filter (where a.status = 'absent') as absent,
      count(*) filter (where a.status = 'excused') as excused
    from public.attendance a
    join public.groups g on g.id = a.group_id
    left join public.branches b on b.id = g.branch_id
    left join public.profiles p on p.id = a.student_id
    where a.lesson_date between p_from and p_to
    group by g.branch_id, b.name, b.sort_order, g.id, g.name, a.student_id, p.full_name
    order by b.sort_order nulls last, g.name, p.full_name;
end;
$$;

revoke execute on function public.attendance_summary(date, date) from public, anon;
grant execute on function public.attendance_summary(date, date) to authenticated;
