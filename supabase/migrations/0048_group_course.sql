-- Курс группы (0–6) — для подгрупп «0 курс», «1 курс»… внутри филиала.
-- Детские группы (Младшая, Средняя, Старшая, ГВД) и прочие курсы не имеют.
-- Заполняется по названию группы; администратор может поправить вручную.
--
-- Выполнять после 0047.

alter table public.groups add column if not exists course smallint check (course between 0 and 9);

update public.groups set course = coalesce(
  -- «1-1 ИЗО», «0 - 2 (11-12 лет)», «5-1 курс», «0-курс ГВД»
  (substring(name from '^\s*(\d)\s*-'))::smallint,
  -- «ИЗО 1-1», «Изо 2-2», «Курс 3-1»
  (substring(name from '^(?:ИЗО|Изо|изо|Курс|курс)\s+(\d)\s*-'))::smallint,
  -- «4 курс», «Группа 5 курс (16+)»
  (substring(name from '(\d)\s*курс'))::smallint
)
where course is null;

-- Орманова: второй список «1-2 группа» на листе «2-курс» — это 2 курс.
update public.groups g set course = 2
where g.name = '1-2 группа · Орманова'
  and exists (select 1 from public.lessons l where l.group_id = g.id and l.day_of_week = 4);

drop function if exists public.list_signup_groups();
create function public.list_signup_groups()
returns table (id uuid, name text, branch_id uuid, branch_name text, course smallint)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, b.id, b.name, g.course
  from public.groups g
  left join public.branches b on b.id = g.branch_id
  order by b.sort_order nulls last, b.name, g.name;
$$;
revoke execute on function public.list_signup_groups() from public;
grant execute on function public.list_signup_groups() to anon, authenticated;
