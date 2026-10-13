-- QR-отметка в филиалах без терминала распознавания лиц.
--
-- У каждого филиала свой секретный код; администратор печатает его QR и
-- вешает у входа. Ученик (или родитель за своих детей) сканирует QR в
-- приложении — и в группах этого филиала, где сегодня есть занятие, ставится
-- «Был» (если преподаватель уже отметил «Нет» — «Опоздал»). Код можно
-- сменить, если его фото разошлось.
--
-- Выполнять после 0031.

create table public.branch_checkin_codes (
  branch_id uuid primary key references public.branches (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  updated_at timestamptz not null default now()
);

insert into public.branch_checkin_codes (branch_id)
select id from public.branches
on conflict do nothing;

alter table public.branch_checkin_codes enable row level security;

-- Код видит только администратор.
create policy "branch_checkin_codes_admin" on public.branch_checkin_codes
  for select to authenticated using (public.is_admin());

-- Новый филиал — сразу с кодом.
create or replace function public.create_branch_checkin_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.branch_checkin_codes (branch_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger branches_checkin_code
  after insert on public.branches
  for each row execute function public.create_branch_checkin_code();

create or replace function public.regenerate_checkin_code(p_branch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  insert into public.branch_checkin_codes (branch_id) values (p_branch_id)
  on conflict (branch_id) do update
    set token = replace(gen_random_uuid()::text, '-', ''), updated_at = now()
  returning token into v_token;
  return v_token;
end;
$$;

revoke execute on function public.regenerate_checkin_code(uuid) from public, anon;
grant execute on function public.regenerate_checkin_code(uuid) to authenticated;

-- Отметка по QR. Возвращает, кого и в какой группе отметили.
create or replace function public.qr_check_in(p_token text)
returns table (student_name text, group_name text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch uuid;
  v_role text;
  v_today date := (now() at time zone 'Asia/Almaty')::date;
  v_dow int := extract(isodow from (now() at time zone 'Asia/Almaty'))::int;
  r record;
  v_status public.attendance_status;
begin
  if auth.uid() is null then
    raise exception 'insufficient_privilege';
  end if;
  select branch_id into v_branch from public.branch_checkin_codes where token = trim(p_token);
  if v_branch is null then
    raise exception 'invalid_code';
  end if;
  select role::text into v_role from public.profiles where id = auth.uid();
  if v_role not in ('student', 'parent') then
    raise exception 'students_and_parents_only';
  end if;

  for r in
    select gm.group_id, gm.student_id, g.name as gname, p.full_name as sname
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    join public.profiles p on p.id = gm.student_id
    where (gm.student_id = auth.uid()
           or (v_role = 'parent' and exists (
                 select 1 from public.parent_children pc
                 where pc.parent_id = auth.uid() and pc.student_id = gm.student_id)))
      and g.branch_id = v_branch
      and exists (select 1 from public.lessons l where l.group_id = g.id and l.day_of_week = v_dow)
  loop
    insert into public.attendance (group_id, student_id, lesson_date, status, marked_by)
    values (r.group_id, r.student_id, v_today, 'present', auth.uid())
    on conflict (group_id, student_id, lesson_date) where lesson_id is null
    do update set status = case when public.attendance.status = 'absent' then 'late'::public.attendance_status
                                else public.attendance.status end
    returning public.attendance.status into v_status;
    student_name := r.sname;
    group_name := r.gname;
    status := v_status::text;
    return next;
  end loop;
end;
$$;

revoke execute on function public.qr_check_in(text) from public, anon;
grant execute on function public.qr_check_in(text) to authenticated;
