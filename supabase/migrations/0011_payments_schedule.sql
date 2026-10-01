-- Оплаты (учёт начислений и платежей) и изменения в расписании.
--
-- 1) billing_entries — журнал начислений и оплат по ученику. Сотрудник
--    начисляет плату (например, «Октябрь, рисунок») и отмечает принятые
--    оплаты. Ученик видит только свои записи и свой баланс. Платёжного
--    шлюза нет: деньги принимаются вне приложения, здесь только учёт.
--
-- 2) lesson_changes — разовые изменения регулярного занятия на конкретную
--    дату: отмена или перенос по времени / в другой кабинет. Регулярное
--    расписание (lessons) при этом не меняется.

-- =========================================================
-- ОПЛАТЫ
-- =========================================================

create type billing_kind as enum ('charge', 'payment');
create type payment_method as enum ('cash', 'card', 'transfer');

create table public.billing_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  kind billing_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'KZT',
  description text not null,
  -- только для оплат: как принята оплата
  method payment_method,
  entry_date date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind = 'payment' or method is null)
);

create index billing_entries_student_idx on public.billing_entries (student_id, entry_date desc);

alter table public.billing_entries enable row level security;

create policy "billing_entries_select_own_or_staff" on public.billing_entries
  for select using (student_id = auth.uid() or public.is_staff());

create policy "billing_entries_write_staff" on public.billing_entries
  for all using (public.is_staff()) with check (public.is_staff());

-- Автор записи — всегда тот, кто её создал, а не то, что прислал клиент.
create function public.set_billing_entry_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger billing_entries_set_author
  before insert on public.billing_entries
  for each row execute procedure public.set_billing_entry_author();

-- Баланс ученика: оплачено минус начислено. Отрицательный баланс — долг.
-- security_invoker: view подчиняется RLS billing_entries, поэтому ученик
-- видит только свою строку, а сотрудник — всех.
create view public.student_balances
with (security_invoker = true)
as
select
  student_id,
  currency,
  coalesce(sum(amount) filter (where kind = 'charge'), 0) as charged,
  coalesce(sum(amount) filter (where kind = 'payment'), 0) as paid,
  coalesce(sum(amount) filter (where kind = 'payment'), 0)
    - coalesce(sum(amount) filter (where kind = 'charge'), 0) as balance
from public.billing_entries
group by student_id, currency;

grant select on public.student_balances to authenticated;

-- =========================================================
-- ИЗМЕНЕНИЯ В РАСПИСАНИИ
-- =========================================================

create table public.lesson_changes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  lesson_date date not null,
  cancelled boolean not null default false,
  -- при переносе: новое время и/или кабинет; null — без изменений
  start_time time,
  end_time time,
  room text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lesson_id, lesson_date),
  check ((start_time is null) = (end_time is null)),
  check (start_time is null or start_time < end_time)
);

alter table public.lesson_changes enable row level security;

-- Видимость как у самих занятий (lessons_select_all).
create policy "lesson_changes_select_all" on public.lesson_changes
  for select using (auth.role() = 'authenticated');

create policy "lesson_changes_write_staff" on public.lesson_changes
  for all using (public.is_staff()) with check (public.is_staff());

-- Дата изменения должна приходиться на день недели занятия.
create function public.validate_lesson_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lesson_day smallint;
begin
  select day_of_week into lesson_day from public.lessons where id = new.lesson_id;
  if lesson_day is null then
    raise exception 'lesson not found';
  end if;
  if extract(isodow from new.lesson_date)::smallint <> lesson_day then
    raise exception 'lesson_date does not fall on the lesson''s day of week';
  end if;
  if tg_op = 'INSERT' and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger lesson_changes_validate
  before insert or update on public.lesson_changes
  for each row execute procedure public.validate_lesson_change();
