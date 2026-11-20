-- Исправления по проверке безопасности STRIX (ноябрь 2026).
-- Все шесть находок средней важности; критических не было.
--
-- 1. Сторис: нельзя подменить фото после проверки ИИ.
-- 2. Работы и объявления: файл нельзя удалить (и подменить), если ссылка на
--    него сохранена с меткой ?t=.
-- 3. Администратор филиала добавляет в группы только детей своего филиала
--    и назначает преподавателем только сотрудника.
-- 4. Преподаватель, у которого сняли роль, теряет доступ к своим группам.
-- 5. Лимиты ИИ-проверки публикаций нельзя обойти параллельными запросами.
--
-- Выполнять после 0052. Повторный запуск безопасен.

-- =========================================================
-- 1. Сторис
-- =========================================================

-- Запись сторис: путь — файл в своей папке, ссылка — ровно на этот файл.
-- Раньше ссылку можно было указать на любой другой файл, и ИИ проверял
-- не то фото, которое увидят остальные.
drop policy if exists "stories_insert" on public.stories;
create policy "stories_insert" on public.stories
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'pending'
    and ai_reason is null
    and ai_checked_at is null
    and image_path ~ ('^' || auth.uid()::text || '/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp|heic|heif)$')
    and position('..' in image_path) = 0
    and image_url = public.storage_public_prefix() || 'stories/' || image_path
    and public.can_add_story()
  );

-- Файл сторис можно удалить, только когда самой сторис уже нет
-- (приложение сначала удаляет запись, потом файл). Так одобренное фото
-- нельзя удалить и загрузить на его место другое.
drop policy if exists "stories_owner_delete" on storage.objects;
create policy "stories_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.stories s where s.image_path = name)
  );

-- =========================================================
-- 2. Работы и объявления: сравниваем ссылку без метки ?t=
-- =========================================================

drop policy if exists "portfolio_owner_delete" on storage.objects;
create policy "portfolio_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.post_images pi
      where split_part(pi.image_url, '?', 1) = public.storage_public_prefix() || 'portfolio/' || name
    )
  );

drop policy if exists "marketplace_owner_delete" on storage.objects;
create policy "marketplace_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'marketplace'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.marketplace_listing_images li
      where split_part(li.image_url, '?', 1) = public.storage_public_prefix() || 'marketplace/' || name
    )
  );

-- =========================================================
-- 3. Администратор филиала: только дети своего филиала, только сотрудник
-- =========================================================

-- Учится ли ребёнок в филиале этой группы: есть в списке школы
-- (school_roster) или уже состоит в другой группе того же филиала.
create or replace function public.student_in_branch_of_group(p_student_id uuid, p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_student_id and role::text = 'student')
    and exists (
      select 1
      from public.groups g
      join public.groups g2 on g2.branch_id = g.branch_id
      where g.id = p_group_id
        and (
          exists (select 1 from public.school_roster r where r.student_id = p_student_id and r.group_id = g2.id)
          or exists (
            select 1 from public.group_members gm
            where gm.student_id = p_student_id and gm.group_id = g2.id and g2.id <> p_group_id
          )
        )
    );
$$;

-- Является ли пользователь сотрудником (преподавателем или администратором).
create or replace function public.is_staff_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_user_id and role::text in ('staff', 'admin'));
$$;

revoke execute on function public.student_in_branch_of_group(uuid, uuid) from public, anon;
revoke execute on function public.is_staff_user(uuid) from public, anon;
grant execute on function public.student_in_branch_of_group(uuid, uuid) to authenticated;
grant execute on function public.is_staff_user(uuid) to authenticated;

-- Смотреть и убирать — как раньше; добавлять — только детей своего филиала.
drop policy if exists "group_members_write_branch_admin" on public.group_members;
drop policy if exists "group_members_select_branch_admin" on public.group_members;
drop policy if exists "group_members_delete_branch_admin" on public.group_members;
drop policy if exists "group_members_insert_branch_admin" on public.group_members;
drop policy if exists "group_members_update_branch_admin" on public.group_members;

create policy "group_members_select_branch_admin" on public.group_members
  for select to authenticated using (public.is_branch_admin_of_group(group_id));

create policy "group_members_delete_branch_admin" on public.group_members
  for delete to authenticated using (public.is_branch_admin_of_group(group_id));

create policy "group_members_insert_branch_admin" on public.group_members
  for insert to authenticated with check (
    public.is_branch_admin_of_group(group_id)
    and public.student_in_branch_of_group(student_id, group_id)
  );

create policy "group_members_update_branch_admin" on public.group_members
  for update to authenticated
  using (public.is_branch_admin_of_group(group_id))
  with check (
    public.is_branch_admin_of_group(group_id)
    and public.student_in_branch_of_group(student_id, group_id)
  );

-- Преподавателем группы можно назначить только сотрудника.
drop policy if exists "groups_update_branch_admin" on public.groups;
create policy "groups_update_branch_admin" on public.groups
  for update to authenticated
  using (public.is_branch_admin_of(branch_id))
  with check (
    public.is_branch_admin_of(branch_id)
    and (teacher_id is null or public.is_staff_user(teacher_id))
  );

-- =========================================================
-- 4. Снятый с роли преподаватель теряет доступ
-- =========================================================

-- Права «преподавателя группы» действуют, только пока у него роль сотрудника.
create or replace function public.can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or (public.is_staff() and exists (select 1 from public.groups where id = p_group_id and teacher_id = auth.uid()))
    or public.is_branch_admin_of_group(p_group_id);
$$;

drop policy if exists "profile_private_select" on public.profile_private;
create policy "profile_private_select" on public.profile_private
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      public.is_staff()
      and exists (
        select 1
        from public.group_members gm
        join public.groups g on g.id = gm.group_id
        where gm.student_id = profile_private.user_id
          and (g.teacher_id = auth.uid() or public.is_branch_admin_of(g.branch_id))
      )
    )
  );

-- При смене роли: снимаем права филиала, а если человек больше не
-- сотрудник — убираем его из преподавателей групп.
create or replace function public.drop_branch_admin_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role::text <> 'staff' then
    delete from public.branch_admins where user_id = new.id;
  end if;
  if new.role::text not in ('staff', 'admin') then
    update public.groups set teacher_id = null where teacher_id = new.id;
  end if;
  return new;
end;
$$;

-- Те, кого уже сняли с роли раньше.
update public.groups g
   set teacher_id = null
 where g.teacher_id is not null
   and not public.is_staff_user(g.teacher_id);

-- =========================================================
-- 5. ИИ-проверка публикаций: лимиты под блокировкой
-- =========================================================

-- Функция moderate-post вызывает это перед обращением к ИИ. Строки автора
-- и публикации блокируются, поэтому параллельные запросы не обойдут лимиты.
-- Ответ: 'ok' — можно проверять (попытка уже засчитана), 'limit' — лимит
-- исчерпан, 'skip' — проверять не нужно.
create or replace function public.claim_post_moderation(
  p_post_id uuid,
  p_user_id uuid,
  p_max_attempts int,
  p_max_calls int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_checked timestamptz;
  v_attempts int;
  v_calls int;
begin
  perform 1 from public.profiles where id = p_user_id for update;

  select status::text, ai_checked_at, coalesce(ai_attempts, 0)
    into v_status, v_checked, v_attempts
    from public.posts
   where id = p_post_id and author_id = p_user_id
   for update;
  if not found or v_status <> 'pending' or v_checked is not null then
    return 'skip';
  end if;

  select count(*) into v_calls
    from public.ai_moderation_calls
   where user_id = p_user_id and created_at > now() - interval '24 hours';
  if v_attempts >= p_max_attempts or v_calls >= p_max_calls then
    return 'limit';
  end if;

  insert into public.ai_moderation_calls (user_id, post_id) values (p_user_id, p_post_id);
  update public.posts set ai_attempts = v_attempts + 1 where id = p_post_id;
  return 'ok';
end;
$$;

revoke execute on function public.claim_post_moderation(uuid, uuid, int, int) from public, anon, authenticated;
grant execute on function public.claim_post_moderation(uuid, uuid, int, int) to service_role;
