-- Исправления по повторному аудиту безопасности (N-1 … N-20 и остатки старых находок).
-- Выполнять после 0024. Если проект Supabase другой — поменять адрес в storage_public_prefix().

-- =========================================================
-- N-1. Ссылка на картинку — строго наш проект и своя папка
-- =========================================================

-- Начало публичных ссылок хранилища этого проекта.
create or replace function public.storage_public_prefix()
returns text
language sql
immutable
as $$
  select 'https://gjasvpcrddmkqmpwaymu.supabase.co/storage/v1/object/public/'::text;
$$;

create or replace function public.is_own_storage_url(p_url text, p_bucket text, p_owner uuid)
returns boolean
language sql
immutable
as $$
  select p_url is not null
    and starts_with(p_url, public.storage_public_prefix() || p_bucket || '/' || p_owner::text || '/')
    -- после папки владельца — одно имя файла (без «/», «..», «%», «#»), необязательная метка ?t=
    and substr(p_url, length(public.storage_public_prefix() || p_bucket || '/' || p_owner::text || '/') + 1)
        ~ '^[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp|heic|heif)(\?t=[0-9]{1,16})?$'
    and position('..' in p_url) = 0;
$$;

-- Аватар: проверяем целиком (вместе с меткой ?t=).
create or replace function public.enforce_profile_avatar()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.avatar_url is not null
     and new.avatar_url is distinct from old.avatar_url
     and not public.is_own_storage_url(new.avatar_url, 'avatars', new.id) then
    raise exception 'avatar must be uploaded to your own avatars folder';
  end if;
  return new;
end;
$$;

-- =========================================================
-- N-2. Нельзя удалить (а значит и подменить) файл, на который ссылается работа
-- =========================================================

drop policy if exists "portfolio_owner_delete" on storage.objects;
create policy "portfolio_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.post_images pi
      where pi.image_url = public.storage_public_prefix() || 'portfolio/' || name
    )
  );

drop policy if exists "marketplace_owner_delete" on storage.objects;
create policy "marketplace_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'marketplace'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.marketplace_listing_images li
      where li.image_url = public.storage_public_prefix() || 'marketplace/' || name
    )
  );

-- =========================================================
-- N-3, N-4, N-6. ИИ-проверка: версия содержимого, жалобы, лимит вызовов
-- =========================================================

alter table public.posts
  add column if not exists content_version int not null default 0,
  add column if not exists ai_attempts smallint not null default 0;

create or replace function public.enforce_post_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset boolean := coalesce(current_setting('app.moderation_reset', true), '') = 'on';
  v_text_changed boolean;
begin
  if tg_op = 'UPDATE' then
    v_text_changed := new.caption is distinct from old.caption
      or new.title is distinct from old.title
      or new.technique is distinct from old.technique;
    -- Любое изменение текста или фото — новая версия: решение ИИ по старой
    -- версии к ней уже не применится.
    new.content_version := old.content_version + case when v_text_changed or v_reset then 1 else 0 end;
  end if;

  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.moderated_by := null;
      new.moderated_at := null;
      new.created_at := now();
      new.content_version := 0;
      new.ai_attempts := 0;
    else
      new.author_id := old.author_id;
      new.created_at := old.created_at;
      new.ai_attempts := old.ai_attempts;
      if v_reset or (old.status <> 'pending' and v_text_changed) then
        new.status := 'pending';
        new.moderated_by := null;
        new.moderated_at := null;
      else
        new.status := old.status;
        new.moderated_by := old.moderated_by;
        new.moderated_at := old.moderated_at;
      end if;
    end if;
  elsif auth.uid() is not null and tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- L-1: «кто проверил» — всегда тот, кто сделал запрос.
    new.moderated_by := auth.uid();
    new.moderated_at := now();
  end if;
  return new;
end;
$$;

-- Любое изменение фото поста (кроме удаления вместе с постом) делает пост
-- «на проверке» и повышает версию — в том числе если он уже на проверке.
create or replace function public.enforce_post_image_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
  v_author uuid;
begin
  if auth.uid() is null or public.is_staff() then
    return coalesce(new, old);
  end if;
  select author_id into v_author from public.posts where id = v_post_id;
  if v_author is null then
    -- пост удаляется каскадом
    return coalesce(new, old);
  end if;
  if tg_op <> 'DELETE' and not public.is_own_storage_url(new.image_url, 'portfolio', v_author) then
    raise exception 'image must be uploaded to your own portfolio folder';
  end if;
  perform set_config('app.moderation_reset', 'on', true);
  update public.posts set status = 'pending' where id = v_post_id;
  perform set_config('app.moderation_reset', 'off', true);
  return coalesce(new, old);
end;
$$;

-- Применить решение ИИ только к той версии, которую видел Claude.
create function public.apply_ai_decision(p_post_id uuid, p_version int, p_decision text, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_decision not in ('approve', 'reject', 'review') then
    raise exception 'invalid decision';
  end if;
  update public.posts
     set ai_decision = p_decision,
         ai_reason = left(p_reason, 500),
         ai_checked_at = now(),
         status = case p_decision when 'approve' then 'approved'::post_status
                                  when 'reject' then 'rejected'::post_status
                                  else status end,
         moderated_at = case when p_decision in ('approve', 'reject') then now() else moderated_at end
   where id = p_post_id and status = 'pending' and content_version = p_version;
  return found;
end;
$$;
revoke execute on function public.apply_ai_decision(uuid, int, text, text) from public, anon, authenticated;

-- Учёт вызовов ИИ: не больше 20 в сутки на человека и 2 попыток на работу.
create table if not exists public.ai_moderation_calls (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists ai_moderation_calls_user_idx on public.ai_moderation_calls (user_id, created_at);
alter table public.ai_moderation_calls enable row level security;
-- политик нет: пишет и читает только функция moderate-post (service role)

-- Поля ИИ и счётчик попыток пишет только сервер.
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
    elsif new.status = 'pending' and new.content_version <> old.content_version then
      -- Новое содержимое — нужна новая проверка (с учётом лимита попыток).
      new.ai_decision := null;
      new.ai_reason := null;
      new.ai_checked_at := null;
    else
      new.ai_decision := old.ai_decision;
      new.ai_reason := old.ai_reason;
      new.ai_checked_at := old.ai_checked_at;
    end if;
  end if;
  return new;
end;
$$;

-- =========================================================
-- N-16. Жалобы: порог 5, учитываются аккаунты старше 3 дней
-- =========================================================

create or replace function public.hide_post_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.post_reports r
    join auth.users u on u.id = r.reporter_id
    where r.post_id = new.post_id and u.created_at < now() - interval '3 days'
  ) >= 5 then
    perform set_config('app.moderation_reset', 'on', true);
    update public.posts set status = 'pending' where id = new.post_id and status = 'approved';
    perform set_config('app.moderation_reset', 'off', true);
  end if;
  return new;
end;
$$;

-- =========================================================
-- N-7. Лимиты частоты: время записи ставит сервер, счётчик не уменьшается
-- =========================================================

create or replace function public.force_created_at()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger a_post_comments_created_at before insert on public.post_comments
  for each row execute procedure public.force_created_at();
create trigger a_support_messages_created_at before insert on public.support_messages
  for each row execute procedure public.force_created_at();
create trigger a_friendships_created_at before insert on public.friendships
  for each row execute procedure public.force_created_at();
create trigger a_post_reports_created_at before insert on public.post_reports
  for each row execute procedure public.force_created_at();

create table if not exists public.rate_events (
  user_id uuid not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_idx on public.rate_events (user_id, kind, created_at);
alter table public.rate_events enable row level security;
-- политик нет: пишет только функция ниже

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int := tg_argv[1]::int;
  v_interval interval := tg_argv[2]::interval;
  v_count int;
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || tg_table_name));
  select count(*) into v_count from public.rate_events
   where user_id = auth.uid() and kind = tg_table_name and created_at > now() - v_interval;
  if v_count >= v_max then
    raise exception 'rate_limited' using hint = 'Слишком часто. Попробуйте немного позже.';
  end if;
  insert into public.rate_events (user_id, kind) values (auth.uid(), tg_table_name);
  return new;
end;
$$;

alter table public.post_comments
  add constraint post_comments_content_len check (char_length(content) between 1 and 1000) not valid;

-- =========================================================
-- N-8, N-10, N-15. Отдельный код для родителей, длинные коды, лимит проверок
-- =========================================================

-- 14 символов из 32 (без 0/O/1/I) ≈ 70 бит, вида ABCD-EFGH-JKLM-NP.
-- Случайные байты — из gen_random_uuid() (криптографический генератор),
-- без байтов 6 и 8, в которых служебные биты версии.
create or replace function public.generate_roster_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_bytes bytea := uuid_send(gen_random_uuid());
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_raw text := '';
  i int;
begin
  for i in 0..15 loop
    continue when i in (6, 8);
    v_raw := v_raw || substr(v_alphabet, 1 + get_byte(v_bytes, i) % 32, 1);
  end loop;
  return substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4) || '-' || substr(v_raw, 9, 4) || '-' || substr(v_raw, 13, 2);
end;
$$;

alter table public.school_roster
  add column if not exists parent_code text default public.generate_roster_code();
update public.school_roster set parent_code = public.generate_roster_code() where parent_code is null;
alter table public.school_roster alter column parent_code set not null;

-- Неиспользованные коды учеников — новые, длинные (старые короткие перебираемы).
update public.school_roster set code = public.generate_roster_code() where student_id is null;

create unique index if not exists school_roster_code_norm_uidx
  on public.school_roster (public.normalize_roster_code(code));
create unique index if not exists school_roster_parent_code_norm_uidx
  on public.school_roster (public.normalize_roster_code(parent_code));

create or replace function public.find_roster_by_parent_code(p_code text)
returns public.school_roster
language sql
stable
security definer
set search_path = public
as $$
  select * from public.school_roster
  where public.normalize_roster_code(parent_code) = public.normalize_roster_code(p_code)
  limit 1;
$$;
revoke execute on function public.find_roster_by_parent_code(text) from public, anon, authenticated;

-- Привязка родителя: с блокировкой строки (не больше 4 родителей и при гонке).
create or replace function public.attach_parent_to_roster(p_parent_id uuid, p_roster public.school_roster)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid;
begin
  select student_id into v_student from public.school_roster where id = p_roster.id for update;
  if exists (select 1 from public.parent_roster where parent_id = p_parent_id and roster_id = p_roster.id) then
    return;
  end if;
  if (select count(*) from public.parent_roster where roster_id = p_roster.id) >= 4 then
    raise exception 'too_many_parents';
  end if;
  insert into public.parent_roster (parent_id, roster_id) values (p_parent_id, p_roster.id);
  if v_student is not null then
    insert into public.parent_children (parent_id, student_id)
    values (p_parent_id, v_student)
    on conflict do nothing;
  end if;
end;
$$;
revoke execute on function public.attach_parent_to_roster(uuid, public.school_roster) from public, anon, authenticated;

-- Попытки проверки кода без входа: не больше 20 в час с одного IP.
create table if not exists public.anon_code_attempts (
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists anon_code_attempts_idx on public.anon_code_attempts (ip, created_at);
alter table public.anon_code_attempts enable row level security;

create or replace function public.check_signup_code(p_account_type text, p_code text, p_group_id uuid default null)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  r public.school_roster;
  v_ip text := coalesce(
    nullif(trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'unknown'
  );
begin
  if (select count(*) from public.anon_code_attempts where ip = v_ip and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into public.anon_code_attempts (ip) values (v_ip);

  if p_account_type = 'staff' then
    return exists (
      select 1 from public.staff_invites
      where public.normalize_roster_code(code) = public.normalize_roster_code(p_code)
        and used_by is null and expires_at > now()
    );
  elsif p_account_type = 'parent' then
    r := public.find_roster_by_parent_code(p_code);
    return r.id is not null and (select count(*) from public.parent_roster where roster_id = r.id) < 4;
  end if;
  r := public.find_roster_by_code(p_code);
  return r.id is not null and r.student_id is null and r.group_id = p_group_id;
end;
$$;

create or replace function public.link_child_by_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.school_roster;
begin
  if auth.uid() is null
     or not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'parent') then
    raise exception 'only parents can link children';
  end if;
  if (select count(*) from public.code_attempts
      where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited';
  end if;
  insert into public.code_attempts (user_id) values (auth.uid());
  r := public.find_roster_by_parent_code(p_code);
  if r.id is null then
    return false;
  end if;
  perform public.attach_parent_to_roster(auth.uid(), r);
  return true;
end;
$$;

-- Новый код ученика или родителя (если код утёк). Админ или преподаватель группы.
drop function if exists public.regenerate_roster_code(uuid);
create function public.regenerate_roster_code(p_roster_id uuid, p_kind text default 'student')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := public.generate_roster_code();
begin
  if auth.uid() is null or not exists (
    select 1 from public.school_roster where id = p_roster_id and public.can_manage_group(group_id)
  ) then
    raise exception 'insufficient_privilege';
  end if;
  perform set_config('app.roster_regen', 'on', true);
  if p_kind = 'parent' then
    update public.school_roster set parent_code = v_code where id = p_roster_id;
  else
    update public.school_roster set code = v_code where id = p_roster_id and student_id is null;
  end if;
  perform set_config('app.roster_regen', 'off', true);
  return v_code;
end;
$$;
revoke execute on function public.regenerate_roster_code(uuid, text) from public, anon;
grant execute on function public.regenerate_roster_code(uuid, text) to authenticated;

-- =========================================================
-- N-9. Преподаватель не может выдать доступ родителя и читать чужие телефоны
-- =========================================================

-- Коды и привязку к аккаунту меняет только сервер (регистрация, перевыпуск) или админ.
create or replace function public.protect_roster_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin()
     or coalesce(current_setting('app.roster_regen', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.student_id := null;
    new.claimed_at := null;
    new.code := public.generate_roster_code();
    new.parent_code := public.generate_roster_code();
  else
    new.student_id := old.student_id;
    new.claimed_at := old.claimed_at;
    new.code := old.code;
    new.parent_code := old.parent_code;
  end if;
  return new;
end;
$$;

create trigger a_school_roster_protect before insert or update on public.school_roster
  for each row execute procedure public.protect_roster_fields();

-- Состав групп меняет только администратор (ученики попадают в группу по
-- коду при регистрации). Иначе преподаватель мог бы добавить в свою группу
-- любого ученика и увидеть его телефон.
drop policy if exists "group_members_write_manager" on public.group_members;
create policy "group_members_write_admin" on public.group_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- В группах — только ученики.
create or replace function public.check_group_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = new.student_id and role::text = 'student') then
    raise exception 'only students can be group members';
  end if;
  return new;
end;
$$;

create trigger group_members_check_role before insert or update on public.group_members
  for each row execute procedure public.check_group_member_role();

-- Привязку родитель → ребёнок вручную меняет только админ.
drop policy if exists "parent_children_write_staff" on public.parent_children;
create policy "parent_children_write_admin" on public.parent_children
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Старый путь заявок (0017) заменён кодами.
drop function if exists public.approve_parent_link_request(uuid);
drop table if exists public.parent_link_requests;

-- Преподаватель меняет группу только как админ (teacher_id — через админа).
-- (groups_write_admin из 0023 уже даёт запись только админу.)

-- =========================================================
-- N-11. Наследие старой регистрации: выбор группы родителем больше не даёт доступа
-- =========================================================

drop policy if exists "announcements_select_parent_group" on public.announcements;
drop policy if exists "parent_groups_write_staff" on public.parent_groups;
create policy "parent_groups_write_admin" on public.parent_groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.can_see_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_staff()
    or exists (select 1 from public.group_members where group_id = p_group_id and student_id = auth.uid())
    or exists (select 1 from public.groups where id = p_group_id and teacher_id = auth.uid())
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = p_group_id and public.is_parent_of(gm.student_id)
    )
  );
$$;

-- =========================================================
-- N-12. Роли: администратора не разжаловать из приложения, журнал изменений
-- =========================================================

create table if not exists public.role_changes (
  id bigserial primary key,
  user_id uuid,
  old_role text,
  new_role text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
alter table public.role_changes enable row level security;
create policy "role_changes_admin_read" on public.role_changes
  for select to authenticated using (public.is_admin());

create or replace function public.set_user_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege: only administrators can change roles';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot change own role';
  end if;
  select role::text into v_old from public.profiles where id = p_user_id for update;
  if v_old is null then
    raise exception 'profile not found';
  end if;
  -- Снять администратора можно только в SQL Editor (защита от захвата).
  if v_old = 'admin' then
    raise exception 'cannot demote an administrator from the app';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  insert into public.role_changes (user_id, old_role, new_role, changed_by)
  values (p_user_id, v_old, p_role::text, auth.uid());
end;
$$;

-- =========================================================
-- N-14. Код и телефон не остаются в данных аккаунта (и в токенах)
-- =========================================================

create or replace function public.strip_signup_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'code' - 'phone' - 'group_id'
   where id = new.id;
  return new;
end;
$$;

-- Имя «z…», чтобы сработать после handle_new_user (on_auth_user_created).
create trigger z_on_auth_user_created_strip
  after insert on auth.users
  for each row execute procedure public.strip_signup_metadata();

update auth.users
   set raw_user_meta_data = raw_user_meta_data - 'code' - 'phone' - 'group_id'
 where raw_user_meta_data ?| array['code', 'phone', 'group_id'];

-- =========================================================
-- N-19. Кто кого заблокировал — не узнать; комментарии к скрытым работам не видны
-- =========================================================

create or replace function public.am_blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_blocked_between(auth.uid(), p_other);
$$;
revoke execute on function public.am_blocked_with(uuid) from public, anon;
grant execute on function public.am_blocked_with(uuid) to authenticated;

drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own" on public.post_comments
  for insert to authenticated with check (
    auth.uid() = author_id and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'approved' and not public.am_blocked_with(p.author_id)
    )
  );

revoke execute on function public.is_blocked_between(uuid, uuid) from authenticated;

drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select" on public.post_comments
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and (p.status = 'approved' or p.author_id = auth.uid() or public.is_staff())
    )
    and not public.am_blocked_with(author_id)
  );

drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and (p.status = 'approved' or p.author_id = auth.uid() or public.is_staff())
    )
  );

-- =========================================================
-- N-20 / C-1. Профили: родитель не видит справочник всех детей школы
-- Ученики и сотрудники видят всех (поиск друзей, Комьюнити). Родитель —
-- сотрудников, своих детей, их одногруппников и авторов одобренных работ.
-- =========================================================

create or replace function public.can_see_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    p_id = auth.uid()
    or exists (select 1 from public.profiles me where me.id = auth.uid() and me.role::text in ('student', 'staff', 'admin'))
    or exists (select 1 from public.profiles p where p.id = p_id and p.role::text in ('staff', 'admin'))
    or public.is_parent_of(p_id)
    or exists (
      select 1 from public.group_members a
      join public.group_members b on a.group_id = b.group_id
      where b.student_id = p_id and public.is_parent_of(a.student_id)
    )
    or exists (select 1 from public.posts where author_id = p_id and status = 'approved')
  );
$$;
revoke execute on function public.can_see_profile(uuid) from public, anon;
grant execute on function public.can_see_profile(uuid) to authenticated;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_scoped" on public.profiles
  for select to authenticated using (public.can_see_profile(id));

drop policy if exists "achievements_select_all" on public.student_achievements;
create policy "achievements_select_scoped" on public.student_achievements
  for select to authenticated using (public.can_see_profile(student_id));

-- =========================================================
-- M-1. Имя и описание профиля
-- =========================================================

create or replace function public.enforce_profile_text()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;
  -- Имя ученика берётся из списка школы и меняется только через школу.
  if new.role::text = 'student' and new.full_name is distinct from old.full_name then
    new.full_name := old.full_name;
  end if;
  new.full_name := left(trim(new.full_name), 100);
  if new.full_name ~* '(админ|admin|администрац|модератор|moderator|support|поддержк)' then
    raise exception 'name_not_allowed';
  end if;
  if new.bio is not null then
    new.bio := left(new.bio, 500);
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_text
  before update on public.profiles
  for each row execute procedure public.enforce_profile_text();

-- =========================================================
-- M-5. Оплаты: записи не меняются и не удаляются, только добавляются
-- =========================================================

drop policy if exists "billing_entries_write_admin" on public.billing_entries;
create policy "billing_entries_insert_admin" on public.billing_entries
  for insert to authenticated with check (public.is_admin());

-- =========================================================
-- L-1. Авторство — всегда тот, кто сделал запрос
-- =========================================================

create or replace function public.lock_announcement_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.author_id := auth.uid();
    else
      new.author_id := old.author_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger announcements_lock_author before insert or update on public.announcements
  for each row execute procedure public.lock_announcement_author();

create or replace function public.lock_progress_note_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and tg_op = 'UPDATE' then
    new.author_id := old.author_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger progress_notes_lock_author before update on public.progress_notes
  for each row execute procedure public.lock_progress_note_author();

create or replace function public.lock_student_photo_uploader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and tg_op = 'UPDATE' then
    new.uploaded_by := old.uploaded_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger student_photos_lock_uploader before update on public.student_photos
  for each row execute procedure public.lock_student_photo_uploader();

-- Объявления о продаже: «кто проверил» — тот, кто сделал запрос.
create or replace function public.enforce_listing_moderation_fields()
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
      new.created_at := now();
    elsif tg_op = 'UPDATE' then
      new.seller_id := old.seller_id;
      new.created_at := old.created_at;
      if coalesce(current_setting('app.moderation_reset', true), '') = 'on' or (
        old.status <> 'pending' and (
          new.title is distinct from old.title
          or new.description is distinct from old.description
          or new.price is distinct from old.price
          or new.currency is distinct from old.currency
          or new.contact_info is distinct from old.contact_info
        )
      ) then
        new.status := 'pending';
        new.moderated_by := null;
        new.moderated_at := null;
      else
        new.status := old.status;
        new.moderated_by := old.moderated_by;
        new.moderated_at := old.moderated_at;
      end if;
    end if;
  elsif auth.uid() is not null and tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.moderated_by := auth.uid();
    new.moderated_at := now();
  end if;
  return new;
end;
$$;

-- =========================================================
-- L-3, L-10. Служебные функции без анонимов, посещаемость — только админ
-- =========================================================

revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.is_parent_of(uuid) from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_parent_of(uuid) to authenticated;

drop policy if exists "attendance_write_staff" on public.attendance;
create policy "attendance_write_admin" on public.attendance
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- Регистрация: родитель — по коду для родителей (parent_code), не по коду ученика
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_type text := coalesce(v_meta ->> 'account_type', '');
  v_phone text := regexp_replace(coalesce(v_meta ->> 'phone', ''), '[^0-9+]', '', 'g');
  v_name text := left(trim(coalesce(v_meta ->> 'full_name', '')), 100);
  v_group_id uuid;
  r public.school_roster;
  v_invite public.staff_invites;
begin
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 10 and 15 then
    raise exception 'phone_required';
  end if;

  if v_type = 'staff' then
    select * into v_invite from public.staff_invites
    where public.normalize_roster_code(code) = public.normalize_roster_code(v_meta ->> 'code')
      and used_by is null and expires_at > now()
    for update;
    if v_invite.id is null then
      raise exception 'invalid_staff_code';
    end if;
    insert into public.profiles (id, full_name, role)
    values (new.id, v_name, v_invite.role::public.user_role);
    insert into public.profile_private (user_id, phone) values (new.id, v_phone);
    update public.staff_invites set used_by = new.id, used_at = now() where id = v_invite.id;
    return new;
  end if;

  if v_type = 'parent' then
    r := public.find_roster_by_parent_code(v_meta ->> 'code');
    if r.id is null then
      raise exception 'invalid_child_code';
    end if;
    if v_name ~* '(админ|admin|администрац|модератор|moderator|support|поддержк)' then
      raise exception 'name_not_allowed';
    end if;
    insert into public.profiles (id, full_name, role)
    values (new.id, v_name, 'parent'::public.user_role);
    insert into public.profile_private (user_id, phone) values (new.id, v_phone);
    perform public.attach_parent_to_roster(new.id, r);
    return new;
  end if;

  begin
    v_group_id := nullif(v_meta ->> 'group_id', '')::uuid;
  exception when invalid_text_representation then
    v_group_id := null;
  end;
  r := public.find_roster_by_code(v_meta ->> 'code');
  if r.id is not null then
    select * into r from public.school_roster where id = r.id for update;
  end if;
  if r.id is null or r.student_id is not null or r.group_id is distinct from v_group_id then
    raise exception 'invalid_student_code';
  end if;
  insert into public.profiles (id, full_name, role)
  values (new.id, r.full_name, 'student'::public.user_role);
  insert into public.profile_private (user_id, phone) values (new.id, v_phone);
  insert into public.group_members (group_id, student_id) values (r.group_id, new.id)
  on conflict do nothing;
  update public.school_roster set student_id = new.id, claimed_at = now() where id = r.id;
  return new;
end;
$$;
