-- Исправления по повторному аудиту безопасности (13 октября).
--
-- 1. QR-отметка — только во время занятия (за час до начала и до конца),
--    отменённые занятия не отмечаются.
-- 2. События: автор ставится сервером; менять и удалять может автор или
--    администратор; не больше 3 новых событий в сутки от одного сотрудника.
-- 3. «Я оплатил»: сумму записи указывает администратор при подтверждении;
--    заявку можно создать только на ученика.
-- 4. Коды 1С и Битрикса нельзя задать и при создании строки списка.
-- 5. Номер выгрузки в 1С выдаёт только сервер.
-- 6. Чат закрывается, если родителя отвязали от ребёнка; лимит 30 сообщений в час.
-- 7. Выданные заявки на материалы меняет только администратор.
-- 8. Хранилище фото с сайта: только картинки до 5 МБ.
--
-- Выполнять после 0038.

-- ---------- 1. QR-отметка только во время занятия ----------

create or replace function public.qr_check_in(p_token text)
returns table (student_name text, group_name text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch uuid;
  v_role text;
  v_now timestamp := now() at time zone 'Asia/Almaty';
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
      -- Окно отметки: за час до начала и до конца занятия (с учётом переноса).
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

-- ---------- 2. События ----------

create or replace function public.prepare_school_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    if auth.uid() is not null and not public.is_admin() and (
      select count(*) from public.school_events
      where created_by = auth.uid() and created_at > now() - interval '1 day'
    ) >= 3 then
      raise exception 'rate_limited';
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists school_events_prepare on public.school_events;
create trigger school_events_prepare
  before insert or update on public.school_events
  for each row execute function public.prepare_school_event();

drop policy if exists "school_events_write_staff" on public.school_events;
create policy "school_events_insert_staff" on public.school_events
  for insert to authenticated with check (public.is_staff());
create policy "school_events_update_owner" on public.school_events
  for update to authenticated
  using (public.is_staff() and (created_by = auth.uid() or public.is_admin()))
  with check (public.is_staff() and (created_by = auth.uid() or public.is_admin()));
create policy "school_events_delete_owner" on public.school_events
  for delete to authenticated using (public.is_staff() and (created_by = auth.uid() or public.is_admin()));

-- ---------- 3. «Я оплатил» ----------

drop policy if exists "payment_claims_insert" on public.payment_claims;
create policy "payment_claims_insert" on public.payment_claims
  for insert to authenticated with check (
    claimed_by = auth.uid()
    and (student_id = auth.uid() or public.is_parent_of(student_id))
    and exists (select 1 from public.profiles where id = student_id and role::text = 'student')
  );

drop function if exists public.decide_payment_claim(uuid, boolean);
create function public.decide_payment_claim(p_claim_id uuid, p_confirm boolean, p_amount numeric default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.payment_claims;
  v_entry uuid;
  v_amount numeric;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  select * into v_claim from public.payment_claims where id = p_claim_id for update;
  if v_claim.id is null then
    raise exception 'claim not found';
  end if;
  if v_claim.status <> 'pending' then
    raise exception 'already_decided';
  end if;
  if p_confirm then
    -- Записывается сумма, которую администратор увидел в Kaspi Pay.
    v_amount := coalesce(p_amount, v_claim.amount);
    if v_amount <= 0 or v_amount > 10000000 then
      raise exception 'invalid amount';
    end if;
    insert into public.billing_entries (student_id, kind, amount, description, method, entry_date, created_by)
    values (
      v_claim.student_id, 'payment', v_amount,
      'Оплата через Kaspi', 'kaspi'::text::public.payment_method,
      (v_claim.created_at at time zone 'Asia/Almaty')::date, auth.uid()
    )
    returning id into v_entry;
  end if;
  update public.payment_claims set
    status = case when p_confirm then 'confirmed' else 'rejected' end,
    billing_entry_id = v_entry,
    decided_by = auth.uid(),
    decided_at = now()
  where id = p_claim_id;
end;
$$;

revoke execute on function public.decide_payment_claim(uuid, boolean, numeric) from public, anon;
grant execute on function public.decide_payment_claim(uuid, boolean, numeric) to authenticated;

-- ---------- 4. Коды 1С и Битрикса и при создании строки ----------

create or replace function public.protect_roster_external_ids()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.onec_code := null;
      new.bitrix_deal_id := null;
    else
      new.onec_code := old.onec_code;
      new.bitrix_deal_id := old.bitrix_deal_id;
    end if;
  end if;
  new.onec_code := nullif(trim(coalesce(new.onec_code, '')), '');
  return new;
end;
$$;

drop trigger if exists school_roster_protect_external_ids on public.school_roster;
create trigger school_roster_protect_external_ids
  before insert or update on public.school_roster
  for each row execute function public.protect_roster_external_ids();

-- ---------- 5. Номер выгрузки в 1С ----------

alter table public.billing_entries alter column export_id set generated always;

-- ---------- 6. Чат ----------

create or replace function public.is_chat_member(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.parent_chats c
    where c.id = p_chat_id
      and auth.uid() in (c.parent_id, c.teacher_id)
      -- Родителя отвязали от ребёнка — чат закрыт для обоих.
      and exists (
        select 1 from public.parent_children pc
        where pc.parent_id = c.parent_id and pc.student_id = c.student_id
      )
  );
$$;

create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.author_id := auth.uid();
  new.body := trim(new.body);
  new.created_at := now();
  if (
    select count(*) from public.parent_chat_messages
    where author_id = new.author_id and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'rate_limited';
  end if;
  update public.parent_chats set
    last_message_at = new.created_at,
    parent_read_at = case when parent_id = new.author_id then new.created_at else parent_read_at end,
    teacher_read_at = case when teacher_id = new.author_id then new.created_at else teacher_read_at end
  where id = new.chat_id;
  return new;
end;
$$;

-- ---------- 7. Заявки на материалы ----------

create or replace function public.decide_material_request(
  p_request_id uuid,
  p_status text,
  p_issued_quantity numeric default null,
  p_note text default null,
  p_cost numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  if auth.uid() is null or not public.is_office() then
    raise exception 'insufficient_privilege';
  end if;
  if p_status not in ('pending', 'issued', 'rejected') then
    raise exception 'invalid status';
  end if;
  if p_issued_quantity is not null and (p_issued_quantity <= 0 or p_issued_quantity > 100000) then
    raise exception 'invalid quantity';
  end if;
  if p_cost is not null and (p_cost < 0 or p_cost > 100000000) then
    raise exception 'invalid cost';
  end if;
  select status into v_current from public.material_requests where id = p_request_id for update;
  if v_current is null then
    raise exception 'request not found';
  end if;
  -- Уже решённую заявку (выдачу и сумму) меняет только администратор.
  if v_current <> 'pending' and not public.is_admin() then
    raise exception 'already_decided';
  end if;
  update public.material_requests set
    status = p_status,
    issued_quantity = case when p_status = 'issued' then coalesce(p_issued_quantity, quantity) end,
    cost = case when p_status = 'issued' then p_cost end,
    office_note = nullif(left(trim(coalesce(p_note, '')), 1000), ''),
    decided_by = case when p_status = 'pending' then null else auth.uid() end,
    decided_at = case when p_status = 'pending' then null else now() end
  where id = p_request_id;
end;
$$;

-- ---------- 8. Хранилище фото с сайта ----------

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'shop-images';

-- Время последнего обновления объявлений — без текста ошибки для всех.
drop policy if exists "shop_sync_select" on public.shop_sync;
create policy "shop_sync_select_admin" on public.shop_sync
  for select to authenticated using (public.is_admin());

create or replace function public.shop_synced_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select synced_at from public.shop_sync where id = 1;
$$;

revoke execute on function public.shop_synced_at() from public, anon;
grant execute on function public.shop_synced_at() to authenticated;
