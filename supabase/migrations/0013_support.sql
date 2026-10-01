-- Раздел «Помощь»: обращения пользователей к администрации и разработчикам.
--
-- Пользователь (ученик, родитель, сотрудник) создаёт обращение: выбирает
-- причину (ошибка в приложении, вопрос администрации, другое), пишет тему
-- и описание. Дальше это переписка в одном окне: все сотрудники видят все
-- обращения и могут ответить; пользователь видит только свои.
--
-- Статус меняется сам: ответил сотрудник → «answered», написал автор →
-- снова «open». Закрыть обращение может сотрудник или сам автор; новое
-- сообщение автора открывает его снова.

create type support_category as enum ('bug', 'question', 'other');
create type support_status as enum ('open', 'answered', 'closed');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category support_category not null,
  subject text not null check (length(subject) between 1 and 200),
  status support_status not null default 'open',
  -- устройство и версия приложения — помогает разработчикам разобрать ошибку
  device_info text check (device_info is null or length(device_info) <= 300),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index support_tickets_author_idx on public.support_tickets (author_id, last_message_at desc);
create index support_tickets_status_idx on public.support_tickets (status, last_message_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Обращение видит автор и все сотрудники.
create policy "support_tickets_select_own_or_staff" on public.support_tickets
  for select using (author_id = auth.uid() or public.is_staff());

-- Создаются только через create_support_ticket (обращение + первое
-- сообщение одной операцией), напрямую — нет.
revoke insert, delete on public.support_tickets from anon, authenticated;

-- Менять можно только статус: сотрудник — любой, автор — только закрыть.
revoke update on public.support_tickets from anon, authenticated;
grant update (status) on public.support_tickets to authenticated;

create policy "support_tickets_update_status" on public.support_tickets
  for update using (author_id = auth.uid() or public.is_staff())
  with check (public.is_staff() or (author_id = auth.uid() and status = 'closed'));

create policy "support_messages_select_own_or_staff" on public.support_messages
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.author_id = auth.uid()
    )
  );

-- Писать в обращение может его автор и любой сотрудник, только от своего имени.
create policy "support_messages_insert_own_or_staff" on public.support_messages
  for insert with check (
    author_id = auth.uid()
    and (
      public.is_staff()
      or exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.author_id = auth.uid()
      )
    )
  );

-- Сообщения не редактируются и не удаляются: это история обращения.
revoke update, delete on public.support_messages from anon, authenticated;

-- Новое сообщение обновляет статус и время последнего сообщения.
create function public.on_support_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket_author uuid;
begin
  select author_id into ticket_author from public.support_tickets where id = new.ticket_id;
  update public.support_tickets
  set
    last_message_at = new.created_at,
    status = case when new.author_id = ticket_author then 'open' else 'answered' end::support_status
  where id = new.ticket_id;
  return new;
end;
$$;

create trigger support_messages_after_insert
  after insert on public.support_messages
  for each row execute procedure public.on_support_message();

-- Создать обращение вместе с первым сообщением. Возвращает id обращения и
-- id первого сообщения (по нему клиент вызывает push сотрудникам).
create function public.create_support_ticket(
  p_category support_category,
  p_subject text,
  p_body text,
  p_device_info text default null
)
returns table (ticket_id uuid, message_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_ticket uuid;
  new_message uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_subject), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'subject and body are required';
  end if;

  insert into public.support_tickets (author_id, category, subject, device_info)
  values (auth.uid(), p_category, trim(p_subject), left(p_device_info, 300))
  returning id into new_ticket;

  insert into public.support_messages (ticket_id, author_id, body)
  values (new_ticket, auth.uid(), trim(p_body))
  returning id into new_message;

  return query select new_ticket, new_message;
end;
$$;

revoke execute on function public.create_support_ticket(support_category, text, text, text) from public, anon;
grant execute on function public.create_support_ticket(support_category, text, text, text) to authenticated;

-- Настройка push: ответы по обращениям (для сотрудников — новые обращения).
alter table public.profiles
  add column notify_support boolean not null default true;

comment on column public.profiles.notify_support is 'Получать push об ответах на обращения в «Помощь» (сотрудникам — о новых обращениях)';
