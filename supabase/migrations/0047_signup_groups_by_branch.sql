-- Регистрация: группы показываются по филиалам (групп больше сотни).
-- Старые версии приложения читают только id и name — лишние поля им не мешают.
--
-- Выполнять после 0046.

drop function if exists public.list_signup_groups();
create function public.list_signup_groups()
returns table (id uuid, name text, branch_id uuid, branch_name text)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, b.id, b.name
  from public.groups g
  left join public.branches b on b.id = g.branch_id
  order by b.sort_order nulls last, b.name, g.name;
$$;
revoke execute on function public.list_signup_groups() from public;
grant execute on function public.list_signup_groups() to anon, authenticated;
