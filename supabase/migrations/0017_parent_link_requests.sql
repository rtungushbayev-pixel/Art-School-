-- Родитель сам находит своего ребёнка («+» в «Мои дети») и отправляет заявку.
--
-- Сама заявка доступа не даёт: прогресс, галерея и фото с занятий ребёнка
-- (is_parent_of из 0012) откроются только после того, как сотрудник
-- подтвердит заявку в разделе «Проверка». Иначе любой мог бы назваться
-- родителем чужого ребёнка.

create table public.parent_link_requests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id),
  check (parent_id <> student_id)
);

create index parent_link_requests_created_idx on public.parent_link_requests (created_at);

-- Заявку отправляет только родитель и только на ученика, ещё не привязанного к нему.
create function public.check_parent_link_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = new.parent_id and role::text = 'parent') then
    raise exception 'only parents can request a child link';
  end if;
  if not exists (select 1 from public.profiles where id = new.student_id and role::text = 'student') then
    raise exception 'child must be a student';
  end if;
  if exists (
    select 1 from public.parent_children where parent_id = new.parent_id and student_id = new.student_id
  ) then
    raise exception 'child_already_linked';
  end if;
  return new;
end;
$$;

create trigger parent_link_requests_check
  before insert on public.parent_link_requests
  for each row execute procedure public.check_parent_link_request();

alter table public.parent_link_requests enable row level security;

create policy "parent_link_requests_select" on public.parent_link_requests
  for select using (parent_id = auth.uid() or public.is_staff());

create policy "parent_link_requests_insert_own" on public.parent_link_requests
  for insert with check (parent_id = auth.uid());

-- Родитель может отозвать свою заявку, сотрудник — отклонить любую.
create policy "parent_link_requests_delete" on public.parent_link_requests
  for delete using (parent_id = auth.uid() or public.is_staff());

-- Подтверждение: привязать ребёнка и убрать заявку. Только сотрудник.
create function public.approve_parent_link_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.parent_link_requests;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'insufficient_privilege: only staff can approve';
  end if;

  select * into v_request from public.parent_link_requests where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;

  insert into public.parent_children (parent_id, student_id)
  values (v_request.parent_id, v_request.student_id)
  on conflict do nothing;

  delete from public.parent_link_requests where id = p_request_id;
end;
$$;

revoke execute on function public.approve_parent_link_request(uuid) from public, anon;
grant execute on function public.approve_parent_link_request(uuid) to authenticated;
