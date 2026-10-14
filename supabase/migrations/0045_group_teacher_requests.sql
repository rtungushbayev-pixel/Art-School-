-- Запрос на замену преподавателя группы.
--
-- Преподаватель, который подменяет коллегу, открывает группу и нажимает
-- «Заменить преподавателя». Запрос уходит администраторам (push), и после
-- одобрения группа переходит к нему (groups.teacher_id). Остальные
-- открытые запросы по этой группе при этом отклоняются.
--
-- Выполнять после 0044.

create table public.group_teacher_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz
);

create unique index group_teacher_requests_one_pending
  on public.group_teacher_requests (group_id, requested_by)
  where status = 'pending';

-- Пишут только RPC ниже; читают автор запроса и администратор.
alter table public.group_teacher_requests enable row level security;
create policy "group_teacher_requests_select" on public.group_teacher_requests
  for select to authenticated using (requested_by = auth.uid() or public.is_admin());

create or replace function public.request_group_takeover(p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'staff') then
    raise exception 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.groups where id = p_group_id) then
    raise exception 'group_not_found';
  end if;
  if exists (select 1 from public.groups where id = p_group_id and teacher_id = auth.uid()) then
    raise exception 'already_teacher';
  end if;
  select id into v_id from public.group_teacher_requests
    where group_id = p_group_id and requested_by = auth.uid() and status = 'pending';
  if v_id is not null then
    return v_id;
  end if;
  insert into public.group_teacher_requests (group_id, requested_by)
  values (p_group_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.decide_group_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.group_teacher_requests;
begin
  if not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  update public.group_teacher_requests
    set status = case when p_approve then 'approved' else 'rejected' end,
        decided_by = auth.uid(),
        decided_at = now()
    where id = p_request_id and status = 'pending'
    returning * into r;
  if r.id is null then
    raise exception 'request_not_pending';
  end if;
  if p_approve then
    update public.groups set teacher_id = r.requested_by where id = r.group_id;
    update public.group_teacher_requests
      set status = 'rejected', decided_by = auth.uid(), decided_at = now()
      where group_id = r.group_id and status = 'pending';
  end if;
end;
$$;

revoke execute on function public.request_group_takeover(uuid) from public, anon;
grant execute on function public.request_group_takeover(uuid) to authenticated;
revoke execute on function public.decide_group_request(uuid, boolean) from public, anon;
grant execute on function public.decide_group_request(uuid, boolean) to authenticated;
