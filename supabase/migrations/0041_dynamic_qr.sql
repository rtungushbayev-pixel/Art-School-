-- Динамический QR филиала: код на планшете у входа меняется каждые 30 секунд.
--
-- Планшет подключается к филиалу один раз: администратор показывает
-- одноразовый код подключения (действует 15 минут), его вводят на планшете
-- в «Режиме планшета». Планшет получает свой секретный ключ и раз в
-- несколько секунд спрашивает у сервера текущий код. Код — хеш секрета
-- филиала и номера 30-секундного окна, поэтому фото QR устаревает через
-- полминуты. Сервер принимает текущий и предыдущий код (запас на сеть).
--
-- Отметка по-прежнему только во время занятия (окно из 0039).
-- Геолокация не используется.
--
-- Выполнять после 0040.

create table public.branch_kiosks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  device_token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  pairing_code text unique,
  pairing_expires_at timestamptz,
  paired_at timestamptz,
  last_seen_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.branch_kiosks enable row level security;

-- Администратор видит планшеты (без ключа — ключ знает только сам планшет).
create policy "branch_kiosks_admin" on public.branch_kiosks
  for select to authenticated using (public.is_admin());
revoke select on public.branch_kiosks from authenticated, anon;
grant select (id, branch_id, pairing_code, pairing_expires_at, paired_at, last_seen_at, created_at)
  on public.branch_kiosks to authenticated;

create policy "branch_kiosks_delete_admin" on public.branch_kiosks
  for delete to authenticated using (public.is_admin());

-- Код для окна номер N (30 секунд).
create or replace function public.branch_qr_code(p_branch_id uuid, p_window bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select left(encode(sha256(convert_to(c.token || ':' || p_window::text, 'UTF8')), 'hex'), 32)
  from public.branch_checkin_codes c
  where c.branch_id = p_branch_id;
$$;

revoke execute on function public.branch_qr_code(uuid, bigint) from public, anon, authenticated;

-- Администратор: новый планшет для филиала, возвращает код подключения.
create or replace function public.create_kiosk_pairing(p_branch_id uuid)
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
  -- 8 символов без похожих (0/O, 1/I).
  v_code := upper(translate(left(replace(gen_random_uuid()::text, '-', ''), 8), '01', '89'));
  insert into public.branch_kiosks (branch_id, pairing_code, pairing_expires_at)
  values (p_branch_id, v_code, now() + interval '15 minutes');
  return v_code;
end;
$$;

revoke execute on function public.create_kiosk_pairing(uuid) from public, anon;
grant execute on function public.create_kiosk_pairing(uuid) to authenticated;

-- Планшет: обмен кода подключения на секретный ключ (без входа в аккаунт).
create or replace function public.pair_kiosk(p_code text)
returns table (device_token text, branch_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kiosk public.branch_kiosks;
begin
  select * into v_kiosk from public.branch_kiosks
  where pairing_code = upper(trim(p_code)) and pairing_expires_at > now()
  for update;
  if v_kiosk.id is null then
    raise exception 'invalid_pairing_code';
  end if;
  update public.branch_kiosks
  set pairing_code = null, pairing_expires_at = null, paired_at = now(), last_seen_at = now()
  where id = v_kiosk.id;
  return query
    select v_kiosk.device_token, b.name from public.branches b where b.id = v_kiosk.branch_id;
end;
$$;

revoke execute on function public.pair_kiosk(text) from public;
grant execute on function public.pair_kiosk(text) to anon, authenticated;

-- Планшет: текущий код филиала и сколько секунд он ещё действует.
create or replace function public.kiosk_current_qr(p_device_token text)
returns table (branch_id uuid, branch_name text, code text, seconds_left int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kiosk public.branch_kiosks;
  v_epoch bigint := floor(extract(epoch from now()))::bigint;
  v_window bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  select * into v_kiosk from public.branch_kiosks
  where device_token = p_device_token and paired_at is not null;
  if v_kiosk.id is null then
    raise exception 'kiosk_not_paired';
  end if;
  update public.branch_kiosks set last_seen_at = now() where id = v_kiosk.id
    and (last_seen_at is null or last_seen_at < now() - interval '1 minute');
  return query
    select b.id, b.name, public.branch_qr_code(b.id, v_window), (30 - (v_epoch % 30))::int
    from public.branches b where b.id = v_kiosk.branch_id;
end;
$$;

revoke execute on function public.kiosk_current_qr(text) from public;
grant execute on function public.kiosk_current_qr(text) to anon, authenticated;

-- Отметка по динамическому QR: «<branch_id>.<код>», код текущего или
-- предыдущего окна; дальше — как раньше (своё занятие, окно времени).
create or replace function public.qr_check_in(p_token text)
returns table (student_name text, group_name text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch uuid;
  v_code text;
  v_role text;
  v_window bigint := floor(extract(epoch from now()) / 30)::bigint;
  v_now timestamp := now() at time zone 'Asia/Almaty';
  v_today date := (now() at time zone 'Asia/Almaty')::date;
  v_dow int := extract(isodow from (now() at time zone 'Asia/Almaty'))::int;
  r record;
  v_status public.attendance_status;
begin
  if auth.uid() is null then
    raise exception 'insufficient_privilege';
  end if;
  begin
    v_branch := split_part(trim(p_token), '.', 1)::uuid;
  exception when others then
    raise exception 'invalid_code';
  end;
  v_code := split_part(trim(p_token), '.', 2);
  if v_code = '' or v_code not in (
    public.branch_qr_code(v_branch, v_window),
    public.branch_qr_code(v_branch, v_window - 1)
  ) then
    raise exception 'expired_code';
  end if;
  select role::text into v_role from public.profiles where id = auth.uid();
  if v_role not in ('student', 'parent') then
    raise exception 'students_and_parents_only';
  end if;

  for r in
    select distinct gm.group_id, gm.student_id, g.name as gname, p.full_name as sname
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    join public.profiles p on p.id = gm.student_id
    join public.lessons l on l.group_id = g.id and l.day_of_week = v_dow
    left join public.lesson_changes ch on ch.lesson_id = l.id and ch.lesson_date = v_today
    where (gm.student_id = auth.uid()
           or (v_role = 'parent' and exists (
                 select 1 from public.parent_children pc
                 where pc.parent_id = auth.uid() and pc.student_id = gm.student_id)))
      and g.branch_id = v_branch
      and coalesce(ch.cancelled, false) = false
      and v_now between (v_today + coalesce(ch.start_time, l.start_time)) - interval '60 minutes'
                    and (v_today + coalesce(ch.end_time, l.end_time))
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
