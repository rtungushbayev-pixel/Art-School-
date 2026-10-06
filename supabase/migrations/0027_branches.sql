-- Филиалы и руководители филиалов.
--
-- Заявку на материалы создаёт только руководитель филиала; заявка
-- привязывается к его филиалу. Администрация видит заявки по филиалам и при
-- выдаче может указать сумму (₸). Администратор видит сводку по филиалам и
-- материалам: количество и расходы.
--
-- Выполнять после 0026.

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 100),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.branches enable row level security;

create policy "branches_select" on public.branches
  for select to authenticated using (true);
create policy "branches_write_admin" on public.branches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.branches (name, sort_order) values
  ('Ауэзова', 1),
  ('6 мкрн', 2),
  ('Орманова', 3),
  ('Мамыр', 4),
  ('Толе би (Сайран)', 5),
  ('Аккент', 6),
  ('Орбита', 7)
on conflict (name) do update set sort_order = excluded.sort_order;

-- Руководитель филиала: сотрудник, которого отметил администратор.
create table public.branch_heads (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.branch_heads enable row level security;

-- Видят: сам руководитель, Администрация и администратор. Меняет — только
-- администратор через set_branch_head.
create policy "branch_heads_select" on public.branch_heads
  for select to authenticated using (user_id = auth.uid() or public.is_office());

create or replace function public.set_branch_head(p_user_id uuid, p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  if p_branch_id is null then
    delete from public.branch_heads where user_id = p_user_id;
    return;
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role::text in ('staff', 'admin')) then
    raise exception 'only staff can head a branch';
  end if;
  insert into public.branch_heads (user_id, branch_id) values (p_user_id, p_branch_id)
  on conflict (user_id) do update set branch_id = excluded.branch_id, created_at = now();
end;
$$;

revoke execute on function public.set_branch_head(uuid, uuid) from public, anon;
grant execute on function public.set_branch_head(uuid, uuid) to authenticated;

-- =========================================================
-- ЗАЯВКИ: филиал и сумма
-- =========================================================

alter table public.material_requests
  add column branch_id uuid references public.branches (id) on delete set null,
  add column cost numeric(12, 2) check (cost is null or (cost >= 0 and cost <= 100000000));

create index material_requests_branch_idx on public.material_requests (branch_id, created_at desc);

-- Создаёт только руководитель филиала, от своего имени.
drop policy if exists "material_requests_insert" on public.material_requests;
create policy "material_requests_insert" on public.material_requests
  for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.branch_heads where user_id = auth.uid())
  );

-- Филиал берётся из того, чем руководит автор; сумму ставит только Администрация.
create or replace function public.prepare_material_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.teacher_id := auth.uid();
  select branch_id into new.branch_id from public.branch_heads where user_id = auth.uid();
  if new.branch_id is null then
    raise exception 'not_branch_head';
  end if;
  new.material := trim(new.material);
  new.comment := nullif(trim(coalesce(new.comment, '')), '');
  new.status := 'pending';
  new.issued_quantity := null;
  new.cost := null;
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

drop function if exists public.decide_material_request(uuid, text, numeric, text);
create function public.decide_material_request(
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
  update public.material_requests set
    status = p_status,
    issued_quantity = case when p_status = 'issued' then coalesce(p_issued_quantity, quantity) end,
    cost = case when p_status = 'issued' then p_cost end,
    office_note = nullif(left(trim(coalesce(p_note, '')), 1000), ''),
    decided_by = case when p_status = 'pending' then null else auth.uid() end,
    decided_at = case when p_status = 'pending' then null else now() end
  where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;
end;
$$;

revoke execute on function public.decide_material_request(uuid, text, numeric, text, numeric) from public, anon;
grant execute on function public.decide_material_request(uuid, text, numeric, text, numeric) to authenticated;

-- Сводка: выданное за период по филиалам, материалам и руководителям.
drop function if exists public.material_usage_summary(date, date);
create function public.material_usage_summary(p_from date, p_to date)
returns table (
  branch_id uuid,
  branch_name text,
  material text,
  unit text,
  teacher_id uuid,
  teacher_name text,
  total_quantity numeric,
  total_cost numeric,
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
      r.branch_id,
      coalesce(b.name, '') as branch_name,
      min(r.material) as material,
      r.unit,
      r.teacher_id,
      coalesce(p.full_name, '') as teacher_name,
      sum(r.issued_quantity) as total_quantity,
      coalesce(sum(r.cost), 0) as total_cost,
      count(*) as requests_count
    from public.material_requests r
    left join public.branches b on b.id = r.branch_id
    left join public.profiles p on p.id = r.teacher_id
    where r.status = 'issued'
      and r.decided_at >= p_from::timestamptz
      and r.decided_at < (p_to + 1)::timestamptz
    group by r.branch_id, b.name, b.sort_order, lower(r.material), r.unit, r.teacher_id, p.full_name
    order by b.sort_order nulls last, lower(min(r.material)), r.unit;
end;
$$;

revoke execute on function public.material_usage_summary(date, date) from public, anon;
grant execute on function public.material_usage_summary(date, date) to authenticated;
