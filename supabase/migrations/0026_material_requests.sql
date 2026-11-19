-- Заявки на материалы.
--
-- Преподаватель (staff) создаёт заявку: материал, количество, единица,
-- комментарий. Новая роль «Администрация» (office) видит все заявки и
-- отмечает «Выдано» (можно указать выданное количество) или «Отклонено».
-- Администратор видит всё то же и сводку выданного за выбранный период.
--
-- Выполнять после 0025. Новое значение роли используется только как текст
-- (role::text), поэтому весь файл можно выполнить одним запуском.

alter type public.user_role add value if not exists 'office';

-- Администрация школы: роль office или администратор.
create or replace function public.is_office()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('office', 'admin')
  );
$$;

revoke execute on function public.is_office() from public, anon;
grant execute on function public.is_office() to authenticated;

-- =========================================================
-- ПРИГЛАШЕНИЯ: администратор может пригласить и «Администрацию»
-- =========================================================

alter table public.staff_invites drop constraint if exists staff_invites_role_check;
alter table public.staff_invites
  add constraint staff_invites_role_check check (role in ('staff', 'admin', 'office'));

create or replace function public.create_staff_invite(p_role text default 'staff', p_note text default null)
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
  if p_role not in ('staff', 'admin', 'office') then
    raise exception 'invalid role';
  end if;
  insert into public.staff_invites (role, note, created_by)
  values (p_role, left(p_note, 200), auth.uid())
  returning code into v_code;
  return v_code;
end;
$$;

-- =========================================================
-- ЗАЯВКИ
-- =========================================================

create table public.material_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  material text not null check (length(trim(material)) between 1 and 200),
  quantity numeric(10, 2) not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (unit in ('pcs', 'pack', 'set', 'l', 'kg', 'm', 'sheet')),
  comment text check (comment is null or length(comment) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'issued', 'rejected')),
  issued_quantity numeric(10, 2) check (issued_quantity is null or (issued_quantity > 0 and issued_quantity <= 100000)),
  office_note text check (office_note is null or length(office_note) <= 1000),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index material_requests_teacher_idx on public.material_requests (teacher_id, created_at desc);
create index material_requests_status_idx on public.material_requests (status, created_at desc);
create index material_requests_decided_idx on public.material_requests (decided_at) where status = 'issued';

alter table public.material_requests enable row level security;

-- Видят: автор заявки и Администрация (вместе с администратором).
create policy "material_requests_select" on public.material_requests
  for select to authenticated using (teacher_id = auth.uid() or public.is_office());

-- Создаёт преподаватель (или администратор) только от своего имени.
create policy "material_requests_insert" on public.material_requests
  for insert to authenticated with check (teacher_id = auth.uid() and public.is_staff());

-- Отменить можно только свою заявку, пока её не рассмотрели.
create policy "material_requests_delete_pending" on public.material_requests
  for delete to authenticated using (teacher_id = auth.uid() and status = 'pending');

-- Прямого update нет: решение — только через decide_material_request.

-- Новая заявка: статус и решение ставит сервер, время — тоже сервер;
-- не больше 30 заявок от одного человека за сутки.
create or replace function public.prepare_material_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.teacher_id := auth.uid();
  new.material := trim(new.material);
  new.comment := nullif(trim(coalesce(new.comment, '')), '');
  new.status := 'pending';
  new.issued_quantity := null;
  new.office_note := null;
  new.decided_by := null;
  new.decided_at := null;
  new.created_at := now();
  if (
    select count(*) from public.material_requests
    where teacher_id = new.teacher_id and created_at > now() - interval '1 day'
  ) >= 30 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

create trigger material_requests_prepare
  before insert on public.material_requests
  for each row execute function public.prepare_material_request();

-- Решение по заявке: «Выдано» (с количеством; по умолчанию — сколько просили)
-- или «Отклонено». Решение можно поменять, пока заявка в работе.
create or replace function public.decide_material_request(
  p_request_id uuid,
  p_status text,
  p_issued_quantity numeric default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  update public.material_requests set
    status = p_status,
    issued_quantity = case when p_status = 'issued' then coalesce(p_issued_quantity, quantity) end,
    office_note = nullif(left(trim(coalesce(p_note, '')), 1000), ''),
    decided_by = case when p_status = 'pending' then null else auth.uid() end,
    decided_at = case when p_status = 'pending' then null else now() end
  where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;
end;
$$;

revoke execute on function public.decide_material_request(uuid, text, numeric, text) from public, anon;
grant execute on function public.decide_material_request(uuid, text, numeric, text) to authenticated;

-- Сводка для администратора: сколько каждого материала выдано за период
-- (по дате выдачи), с разбивкой по преподавателям.
create or replace function public.material_usage_summary(p_from date, p_to date)
returns table (
  material text,
  unit text,
  teacher_id uuid,
  teacher_name text,
  total_quantity numeric,
  requests_count bigint
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
      min(r.material) as material,
      r.unit,
      r.teacher_id,
      coalesce(p.full_name, '') as teacher_name,
      sum(r.issued_quantity) as total_quantity,
      count(*) as requests_count
    from public.material_requests r
    left join public.profiles p on p.id = r.teacher_id
    where r.status = 'issued'
      and r.decided_at >= p_from::timestamptz
      and r.decided_at < (p_to + 1)::timestamptz
    group by lower(r.material), r.unit, r.teacher_id, p.full_name
    order by lower(min(r.material)), r.unit, teacher_name;
end;
$$;

revoke execute on function public.material_usage_summary(date, date) from public, anon;
grant execute on function public.material_usage_summary(date, date) to authenticated;

-- Администрация видит имена преподавателей (они и так видны всем как
-- сотрудники) и свой профиль; дополнительный доступ к профилям не нужен.
