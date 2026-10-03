-- ИИ-проверка публикаций Комьюнити и жалобы.
--
-- После публикации функция moderate-post отправляет фото и подпись на
-- проверку Claude. Решение: одобрить (сразу в ленте), отклонить (с причиной
-- для автора) или «сомнительно» (остаётся в «Проверке» для сотрудника).
-- Сотрудник всегда может изменить решение.
--
-- «Пожаловаться» на одобренную публикацию: жалоба видна сотрудникам; после
-- трёх жалоб от разных людей публикация скрывается до ручной проверки.

alter table public.posts
  add column ai_decision text check (ai_decision in ('approve', 'reject', 'review')),
  add column ai_reason text,
  add column ai_checked_at timestamptz;

-- Поля ИИ-проверки пишет только сервер (функция с service role) и сотрудник.
create or replace function public.protect_post_ai_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.ai_decision := null;
      new.ai_reason := null;
      new.ai_checked_at := null;
    else
      -- Автор изменил работу (она снова на проверке) — нужна новая ИИ-проверка.
      if new.status = 'pending' and old.status <> 'pending' then
        new.ai_decision := null;
        new.ai_reason := null;
        new.ai_checked_at := null;
      else
        new.ai_decision := old.ai_decision;
        new.ai_reason := old.ai_reason;
        new.ai_checked_at := old.ai_checked_at;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Имя «z_…», чтобы сработать после триггера модерации (он выставляет статус).
create trigger z_posts_protect_ai_fields
  before insert or update on public.posts
  for each row execute procedure public.protect_post_ai_fields();

-- =========================================================
-- ЖАЛОБЫ
-- =========================================================

create table public.post_reports (
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (reason is null or length(reason) <= 500),
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

alter table public.post_reports enable row level security;

create policy "post_reports_insert_own" on public.post_reports
  for insert to authenticated with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved' and p.author_id <> auth.uid())
  );

create policy "post_reports_select_own_or_staff" on public.post_reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_staff());

create policy "post_reports_delete_staff" on public.post_reports
  for delete to authenticated using (public.is_staff());

create trigger post_reports_rate_limit before insert on public.post_reports
  for each row execute procedure public.enforce_rate_limit('reporter_id', '10', '1 hour');

-- Три жалобы — публикация скрывается до решения сотрудника.
create function public.hide_post_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.post_reports where post_id = new.post_id) >= 3 then
    perform set_config('app.moderation_reset', 'on', true);
    update public.posts set status = 'pending' where id = new.post_id and status = 'approved';
    perform set_config('app.moderation_reset', 'off', true);
  end if;
  return new;
end;
$$;

create trigger post_reports_hide_after_three
  after insert on public.post_reports
  for each row execute procedure public.hide_post_after_reports();
