-- Справочник учеников из Битрикс24 (ФИО → dealId), выгрузка от 14.10.2026.
--
-- В списке школы (school_roster) dealId ставится сам: при добавлении ученика
-- или изменении ФИО ищется точное совпадение имени в справочнике (без учёта
-- регистра, лишних пробелов и «ё»). Если имя встречается в справочнике больше
-- одного раза, ничего не ставится — администратор укажет код вручную.
-- Данные справочника (201 ученик) загружаются отдельно, не этой миграцией.
--
-- Выполнять после 0041.

create table public.bitrix_deal_directory (
  deal_id bigint primary key,
  full_name text not null,
  group_name text,
  registry_no text,
  imported_at timestamptz not null default now()
);

-- Читает и пишет только сервер и администратор.
alter table public.bitrix_deal_directory enable row level security;
create policy "bitrix_deal_directory_admin" on public.bitrix_deal_directory
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.normalize_person_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(regexp_replace(replace(replace(trim(coalesce(p_name, '')), 'ё', 'е'), 'Ё', 'Е'), '\s+', ' ', 'g'));
$$;

create index if not exists bitrix_deal_directory_name_idx
  on public.bitrix_deal_directory (public.normalize_person_name(full_name));

-- dealId по ФИО: только если совпадение одно и код ещё не занят.
create or replace function public.match_bitrix_deal(p_full_name text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case when count(*) = 1 then min(d.deal_id) end
  from public.bitrix_deal_directory d
  where public.normalize_person_name(d.full_name) = public.normalize_person_name(p_full_name)
    and not exists (select 1 from public.school_roster r where r.bitrix_deal_id = d.deal_id);
$$;

revoke execute on function public.match_bitrix_deal(text) from public, anon, authenticated;

-- Срабатывает после защиты внешних кодов (имя триггера по алфавиту позже).
create or replace function public.autofill_roster_deal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bitrix_deal_id is null
     and (tg_op = 'INSERT' or new.full_name is distinct from old.full_name) then
    new.bitrix_deal_id := public.match_bitrix_deal(new.full_name);
  end if;
  return new;
end;
$$;

drop trigger if exists zz_school_roster_autofill_deal on public.school_roster;
create trigger zz_school_roster_autofill_deal
  before insert or update on public.school_roster
  for each row execute function public.autofill_roster_deal();

-- Для уже существующих строк списка (запускает администратор или сервер).
create or replace function public.backfill_roster_deals()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_deal bigint;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  for r in select id, full_name from public.school_roster where bitrix_deal_id is null loop
    v_deal := public.match_bitrix_deal(r.full_name);
    if v_deal is not null then
      update public.school_roster set bitrix_deal_id = v_deal where id = r.id;
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.backfill_roster_deals() from public, anon;
grant execute on function public.backfill_roster_deals() to authenticated;
