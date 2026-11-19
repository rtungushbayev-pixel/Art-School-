-- Запрос на замену от самого преподавателя группы.
--
-- Преподаватель (заболел, уезжает) нажимает «Запрос на замену» в своей
-- группе. Push получают администраторы и остальные преподаватели. Первый
-- преподаватель, нажавший «Взять группу», сразу становится её ведущим —
-- без ожидания администратора; администраторы и автор запроса получают push.
-- Когда автор запроса вернётся, он нажимает «Вернуть группу» и снова
-- становится её преподавателем (если группу всё ещё ведёт заменивший).
--
-- Обычный запрос «Заменить преподавателя» (0045), когда замену никто не
-- просил, по-прежнему одобряет администратор.
--
-- Выполнять после 0045.

alter table public.group_teacher_requests
  add column kind text not null default 'takeover' check (kind in ('takeover', 'replacement')),
  add column taken_by uuid references public.profiles (id) on delete set null;

alter table public.group_teacher_requests drop constraint group_teacher_requests_status_check;
alter table public.group_teacher_requests add constraint group_teacher_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

create unique index group_teacher_requests_one_replacement
  on public.group_teacher_requests (group_id)
  where status = 'pending' and kind = 'replacement';

-- Открытые запросы на замену видят все сотрудники: им нужно знать, кого заменить.
drop policy "group_teacher_requests_select" on public.group_teacher_requests;
create policy "group_teacher_requests_select" on public.group_teacher_requests
  for select to authenticated using (
    requested_by = auth.uid()
    or public.is_admin()
    or (kind = 'replacement' and status = 'pending' and public.is_staff())
  );

-- Преподаватель группы просит замену.
create or replace function public.request_group_replacement(p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.groups g join public.profiles p on p.id = auth.uid()
    where g.id = p_group_id and g.teacher_id = auth.uid() and p.role::text = 'staff'
  ) then
    raise exception 'not_group_teacher';
  end if;
  select id into v_id from public.group_teacher_requests
    where group_id = p_group_id and kind = 'replacement' and status = 'pending';
  if v_id is not null then
    return v_id;
  end if;
  insert into public.group_teacher_requests (group_id, requested_by, kind)
  values (p_group_id, auth.uid(), 'replacement')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_group_replacement(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.group_teacher_requests
    set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
    where id = p_request_id and requested_by = auth.uid() and kind = 'replacement' and status = 'pending';
  if not found then
    raise exception 'request_not_pending';
  end if;
end;
$$;

-- «Взять группу» / «Заменить преподавателя» / «Вернуть группу».
-- Возвращает id запроса; если группа перешла сразу, groups.teacher_id = вызывающий.
create or replace function public.request_group_takeover(p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_teacher uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'staff') then
    raise exception 'insufficient_privilege';
  end if;
  select teacher_id into v_teacher from public.groups where id = p_group_id for update;
  if not found then
    raise exception 'group_not_found';
  end if;
  if v_teacher = auth.uid() then
    raise exception 'already_teacher';
  end if;

  -- Преподаватель просил замену — первый откликнувшийся забирает группу сразу.
  select id into v_id from public.group_teacher_requests
    where group_id = p_group_id and kind = 'replacement' and status = 'pending'
      and requested_by is distinct from auth.uid();
  if v_id is not null then
    update public.group_teacher_requests
      set status = 'approved', taken_by = auth.uid(), decided_by = auth.uid(), decided_at = now()
      where id = v_id;
    update public.groups set teacher_id = auth.uid() where id = p_group_id;
    update public.group_teacher_requests
      set status = 'rejected', decided_by = auth.uid(), decided_at = now()
      where group_id = p_group_id and kind = 'takeover' and status = 'pending';
    return v_id;
  end if;

  -- Возвращение после замены: группу ведёт тот, кто взял её по моему запросу.
  select id into v_id from public.group_teacher_requests
    where group_id = p_group_id and kind = 'replacement' and status = 'approved'
      and requested_by = auth.uid() and taken_by = v_teacher
    order by decided_at desc limit 1;
  if v_id is not null then
    update public.groups set teacher_id = auth.uid() where id = p_group_id;
    insert into public.group_teacher_requests (group_id, requested_by, kind, status, taken_by, decided_by, decided_at)
    values (p_group_id, auth.uid(), 'takeover', 'approved', auth.uid(), auth.uid(), now())
    returning id into v_id;
    return v_id;
  end if;

  -- Иначе — обычный запрос, решает администратор.
  select id into v_id from public.group_teacher_requests
    where group_id = p_group_id and requested_by = auth.uid() and kind = 'takeover' and status = 'pending';
  if v_id is not null then
    return v_id;
  end if;
  insert into public.group_teacher_requests (group_id, requested_by)
  values (p_group_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Администратор одобряет обычный запрос — открытый запрос на замену тоже закрывается.
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
        decided_at = now(),
        taken_by = case when p_approve then requested_by end
    where id = p_request_id and status = 'pending' and kind = 'takeover'
    returning * into r;
  if r.id is null then
    raise exception 'request_not_pending';
  end if;
  if p_approve then
    update public.groups set teacher_id = r.requested_by where id = r.group_id;
    update public.group_teacher_requests
      set status = 'rejected', decided_by = auth.uid(), decided_at = now()
      where group_id = r.group_id and kind = 'takeover' and status = 'pending';
  end if;
end;
$$;

-- Администратор сам сменил преподавателя — открытый запрос на замену закрывается.
create or replace function public.close_replacement_on_teacher_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.teacher_id is distinct from old.teacher_id then
    update public.group_teacher_requests
      set status = 'approved', taken_by = new.teacher_id, decided_by = coalesce(auth.uid(), new.teacher_id), decided_at = now()
      where group_id = new.id and kind = 'replacement' and status = 'pending'
        and requested_by is distinct from new.teacher_id;
  end if;
  return new;
end;
$$;

create trigger groups_close_replacement
  after update of teacher_id on public.groups
  for each row execute function public.close_replacement_on_teacher_change();

revoke execute on function public.request_group_replacement(uuid) from public, anon;
grant execute on function public.request_group_replacement(uuid) to authenticated;
revoke execute on function public.cancel_group_replacement(uuid) from public, anon;
grant execute on function public.cancel_group_replacement(uuid) to authenticated;
revoke execute on function public.close_replacement_on_teacher_change() from public, anon, authenticated;
