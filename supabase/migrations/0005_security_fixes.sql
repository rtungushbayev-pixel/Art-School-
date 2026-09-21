-- Устраняет обход модерации через прямые запросы к REST API в обход экранов
-- приложения. RLS-политики "owner or staff" из 0001/0003 проверяли только
-- владельца строки (auth.uid() = ...), но не то, какие колонки он меняет —
-- Postgres не даёт сравнить old/new прямо в USING/WITH CHECK, поэтому
-- запрещающие изменения не-владельческих полей реализованы триггерами.

-- =========================================================
-- PROFILES: запрет самостоятельной смены роли
-- =========================================================

create function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null для прямых подключений (например, SQL Editor от имени
  -- администратора) — такие правки не проходят через это ограничение.
  if new.role <> old.role and auth.uid() is not null and not public.is_staff() then
    raise exception 'insufficient_privilege: role can only be changed by staff';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

-- =========================================================
-- POSTS: запрет самомодерации (author не может выставить status/moderated_*)
-- =========================================================

create function public.enforce_post_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.moderated_by := null;
      new.moderated_at := null;
    elsif tg_op = 'UPDATE' then
      new.status := old.status;
      new.moderated_by := old.moderated_by;
      new.moderated_at := old.moderated_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_enforce_moderation
  before insert or update on public.posts
  for each row execute procedure public.enforce_post_moderation_fields();

-- =========================================================
-- MARKETPLACE_LISTINGS: аналогичная защита от самоодобрения
-- =========================================================

create function public.enforce_listing_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.moderated_by := null;
      new.moderated_at := null;
    elsif tg_op = 'UPDATE' then
      new.status := old.status;
      new.moderated_by := old.moderated_by;
      new.moderated_at := old.moderated_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_enforce_moderation
  before insert or update on public.marketplace_listings
  for each row execute procedure public.enforce_listing_moderation_fields();

-- =========================================================
-- HOMEWORK_SUBMISSIONS: ученик не может сам себя оценить
-- =========================================================

create function public.enforce_submission_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'submitted';
      new.grade := null;
      new.feedback := null;
      new.reviewed_at := null;
    elsif tg_op = 'UPDATE' then
      new.status := old.status;
      new.grade := old.grade;
      new.feedback := old.feedback;
      new.reviewed_at := old.reviewed_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger submissions_enforce_review
  before insert or update on public.homework_submissions
  for each row execute procedure public.enforce_submission_review_fields();

-- =========================================================
-- ANNOUNCEMENTS: таргетированные объявления не должны быть видны всем
-- =========================================================

drop policy "announcements_select_all" on public.announcements;

create policy "announcements_select_audience" on public.announcements
  for select using (
    public.is_staff()
    or audience = 'all'
    or (
      audience = 'students'
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
    )
    or (audience = 'group' and public.is_group_member(group_id))
  );
