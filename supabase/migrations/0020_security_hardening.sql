-- Закрытие находок аудита безопасности: C-1 (кто что видит), H-3 (обход
-- модерации), H-4 (данные без входа и списки файлов), M-1 (аватар).

-- =========================================================
-- C-1. РАСПИСАНИЕ И СОСТАВ ГРУПП — ТОЛЬКО СВОИМ
-- Раньше любой вошедший видел, в какой группе учится каждый ребёнок и
-- когда и где проходят её занятия.
-- =========================================================

-- Может ли текущий пользователь видеть группу: сотрудник, ученик группы,
-- преподаватель группы, родитель ученика группы или родитель, выбравший
-- группу при старой регистрации (parent_groups из 0014).
create function public.can_see_group(p_group_id uuid)
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
    or exists (select 1 from public.parent_groups where group_id = p_group_id and parent_id = auth.uid())
  );
$$;

revoke execute on function public.can_see_group(uuid) from public, anon;
grant execute on function public.can_see_group(uuid) to authenticated;

drop policy "group_members_select_all" on public.group_members;
create policy "group_members_select_visible" on public.group_members
  for select to authenticated using (public.can_see_group(group_id));

drop policy "lessons_select_all" on public.lessons;
create policy "lessons_select_visible" on public.lessons
  for select to authenticated using (public.can_see_group(group_id));

drop policy "lesson_changes_select_all" on public.lesson_changes;
create policy "lesson_changes_select_visible" on public.lesson_changes
  for select to authenticated using (
    exists (select 1 from public.lessons l where l.id = lesson_id and public.can_see_group(l.group_id))
  );

-- =========================================================
-- H-4. НИЧЕГО БЕЗ ВХОДА
-- Политики без «to authenticated» работали и для анонимного ключа:
-- одобренные работы, объявления о продаже и общие сообщения были видны
-- без входа в приложение.
-- =========================================================

drop policy "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select to authenticated using (
    status = 'approved' or author_id = auth.uid() or public.is_staff()
  );

drop policy "post_images_select" on public.post_images;
create policy "post_images_select" on public.post_images
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.status = 'approved' or p.author_id = auth.uid() or public.is_staff())
    )
  );

drop policy "listings_select" on public.marketplace_listings;
create policy "listings_select" on public.marketplace_listings
  for select to authenticated using (
    status = 'approved' or seller_id = auth.uid() or public.is_staff()
  );

drop policy "listing_images_select" on public.marketplace_listing_images;
create policy "listing_images_select" on public.marketplace_listing_images
  for select to authenticated using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id
        and (l.status = 'approved' or l.seller_id = auth.uid() or public.is_staff())
    )
  );

drop policy "announcements_select_audience" on public.announcements;
create policy "announcements_select_audience" on public.announcements
  for select to authenticated using (
    public.is_staff()
    or audience = 'all'
    or (
      audience = 'students'
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
    )
    or (audience = 'group' and public.is_group_member(group_id))
  );

-- Хранилище: бакеты avatars / portfolio / marketplace публичные, файлы
-- открываются по прямой ссылке и без политик. Политики *_public_read
-- позволяли получить СПИСОК всех файлов, включая отклонённые работы.
-- Оставляем просмотр списка только своей папки (нужно для загрузки с заменой).
drop policy "avatars_public_read" on storage.objects;
drop policy "portfolio_public_read" on storage.objects;
drop policy "marketplace_public_read" on storage.objects;

create policy "avatars_owner_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "portfolio_owner_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "marketplace_owner_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'marketplace' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Функции, которые не нужны без входа.
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke execute on function public.can_have_friends(uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.can_have_friends(uuid) to authenticated;

-- =========================================================
-- H-3. МОДЕРАЦИЮ НЕЛЬЗЯ ОБОЙТИ ПОСЛЕ ОДОБРЕНИЯ
-- =========================================================

-- Ссылка на картинку — только на свой файл в нашем хранилище.
create function public.is_own_storage_url(p_url text, p_bucket text, p_owner uuid)
returns boolean
language sql
immutable
as $$
  select p_url like '%/storage/v1/object/public/' || p_bucket || '/' || p_owner::text || '/%';
$$;

-- Работа: при любом изменении её картинок не сотрудником — снова на проверку.
-- Флаг app.moderation_reset сообщает триггеру posts, что статус меняет
-- сервер, а не автор (иначе он вернул бы старый статус).
create or replace function public.enforce_post_moderation_fields()
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
      new.author_id := old.author_id;
      new.created_at := old.created_at;
      if coalesce(current_setting('app.moderation_reset', true), '') = 'on' then
        new.status := 'pending';
        new.moderated_by := null;
        new.moderated_at := null;
      elsif old.status <> 'pending' and (
        new.caption is distinct from old.caption
        or new.title is distinct from old.title
        or new.technique is distinct from old.technique
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
  end if;
  return new;
end;
$$;

create function public.enforce_post_image_changes()
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
  if tg_op <> 'DELETE' and not public.is_own_storage_url(new.image_url, 'portfolio', v_author) then
    raise exception 'image must be uploaded to your own portfolio folder';
  end if;
  -- Удаление фото (в том числе вместе с работой) проверку не сбрасывает:
  -- так нельзя подменить содержимое, а пост может удаляться каскадом.
  if tg_op <> 'DELETE' then
    perform set_config('app.moderation_reset', 'on', true);
    update public.posts set status = 'pending' where id = v_post_id and status <> 'pending';
    perform set_config('app.moderation_reset', 'off', true);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger post_images_enforce_changes
  before insert or update or delete on public.post_images
  for each row execute procedure public.enforce_post_image_changes();

-- Объявление о продаже: изменение текста, цены, контактов или фото —
-- снова на проверку. Отметка «продано» проверку не сбрасывает.
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
  end if;
  return new;
end;
$$;

create function public.enforce_listing_image_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid := coalesce(new.listing_id, old.listing_id);
  v_seller uuid;
begin
  if auth.uid() is null or public.is_staff() then
    return coalesce(new, old);
  end if;
  select seller_id into v_seller from public.marketplace_listings where id = v_listing_id;
  if tg_op <> 'DELETE' and not public.is_own_storage_url(new.image_url, 'marketplace', v_seller) then
    raise exception 'image must be uploaded to your own marketplace folder';
  end if;
  if tg_op <> 'DELETE' then
    perform set_config('app.moderation_reset', 'on', true);
    update public.marketplace_listings set status = 'pending' where id = v_listing_id and status <> 'pending';
    perform set_config('app.moderation_reset', 'off', true);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger listing_images_enforce_changes
  before insert or update or delete on public.marketplace_listing_images
  for each row execute procedure public.enforce_listing_image_changes();

-- =========================================================
-- M-1. АВАТАР — ТОЛЬКО СВОЙ ФАЙЛ ИЗ ХРАНИЛИЩА
-- (внешняя ссылка могла бы следить за теми, кто открыл профиль)
-- =========================================================

create function public.enforce_profile_avatar()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.avatar_url is not null
     and new.avatar_url is distinct from old.avatar_url
     and not public.is_own_storage_url(split_part(new.avatar_url, '?', 1), 'avatars', new.id) then
    raise exception 'avatar must be uploaded to your own avatars folder';
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_avatar
  before update on public.profiles
  for each row execute procedure public.enforce_profile_avatar();
