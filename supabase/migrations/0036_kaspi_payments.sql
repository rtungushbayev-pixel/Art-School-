-- Оплата через Kaspi Pay.
--
-- У Kaspi нет открытого API, поэтому: приложение открывает ссылку на оплату
-- в кассу школы (своя у филиала или общая), родитель после оплаты нажимает
-- «Я оплатил» — появляется заявка, администратор подтверждает её, и оплата
-- записывается в начисления. Родитель видит оплаты своих детей.
--
-- Выполнять после 0035.

alter type public.payment_method add value if not exists 'kaspi';

-- Родитель видит начисления и оплаты своих детей (и их баланс).
drop policy if exists "billing_entries_select_parent" on public.billing_entries;
create policy "billing_entries_select_parent" on public.billing_entries
  for select to authenticated using (public.is_parent_of(student_id));

-- Ссылки на оплату: у филиала своя, иначе общая школьная.
alter table public.branches add column if not exists kaspi_pay_url text
  check (kaspi_pay_url is null or kaspi_pay_url ~ '^https://');

create table public.payment_settings (
  id int primary key default 1 check (id = 1),
  kaspi_pay_url text check (kaspi_pay_url is null or kaspi_pay_url ~ '^https://'),
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id) values (1) on conflict do nothing;

alter table public.payment_settings enable row level security;

create policy "payment_settings_select" on public.payment_settings
  for select to authenticated using (true);
create policy "payment_settings_write_admin" on public.payment_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ссылка для ученика: по филиалу его группы, иначе общая.
create or replace function public.student_payment_link(p_student_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select b.kaspi_pay_url
       from public.group_members gm
       join public.groups g on g.id = gm.group_id
       join public.branches b on b.id = g.branch_id
      where gm.student_id = p_student_id and b.kaspi_pay_url is not null
      limit 1),
    (select kaspi_pay_url from public.payment_settings where id = 1)
  )
  where auth.uid() = p_student_id or public.is_parent_of(p_student_id) or public.is_admin();
$$;

revoke execute on function public.student_payment_link(uuid) from public, anon;
grant execute on function public.student_payment_link(uuid) to authenticated;

-- «Я оплатил»: заявка, которую подтверждает администратор.
create table public.payment_claims (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0 and amount <= 10000000),
  note text check (note is null or length(note) <= 500),
  claimed_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  billing_entry_id uuid references public.billing_entries (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index payment_claims_status_idx on public.payment_claims (status, created_at desc);

alter table public.payment_claims enable row level security;

create policy "payment_claims_select" on public.payment_claims
  for select to authenticated using (
    claimed_by = auth.uid() or student_id = auth.uid() or public.is_parent_of(student_id) or public.is_admin()
  );

create policy "payment_claims_insert" on public.payment_claims
  for insert to authenticated with check (
    claimed_by = auth.uid() and (student_id = auth.uid() or public.is_parent_of(student_id))
  );

create or replace function public.prepare_payment_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.claimed_by := auth.uid();
  new.status := 'pending';
  new.billing_entry_id := null;
  new.decided_by := null;
  new.decided_at := null;
  new.created_at := now();
  new.note := nullif(trim(coalesce(new.note, '')), '');
  if (
    select count(*) from public.payment_claims
    where claimed_by = new.claimed_by and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

create trigger payment_claims_prepare
  before insert on public.payment_claims
  for each row execute function public.prepare_payment_claim();

-- Подтвердить (записать оплату Kaspi) или отклонить заявку.
create or replace function public.decide_payment_claim(p_claim_id uuid, p_confirm boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.payment_claims;
  v_entry uuid;
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
    insert into public.billing_entries (student_id, kind, amount, description, method, entry_date, created_by)
    values (
      v_claim.student_id, 'payment', v_claim.amount,
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

revoke execute on function public.decide_payment_claim(uuid, boolean) from public, anon;
grant execute on function public.decide_payment_claim(uuid, boolean) to authenticated;
