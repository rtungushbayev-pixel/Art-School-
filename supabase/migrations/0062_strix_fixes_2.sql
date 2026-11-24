-- 0062: исправления по проверке безопасности STRIX от 24.11.2026.
--
-- 1. Удаление аккаунта больше не стирает оплаты, начисления и посещаемость.
-- 2. Чаты с родителями: снятый с группы преподаватель их больше не видит.
-- 3. Фото и заметки об ученике: только преподаватели его групп,
--    администратор филиала и администратор.
-- 4. Объявления: преподаватель пишет только своей группе или сотрудникам
--    и меняет только свои объявления. Всей школе пишет администратор.
-- 5. ИИ-проверка сторис: общий суточный лимит с публикациями (20).
-- 6. Возврат группы после замены: нельзя, если группу потом передавали.
-- 7. Филиал ученика: проверку может вызвать только администратор филиала.
-- 8. Опыт героя: посещаемость видят только ученик, его родители и сотрудники.
-- 9. Лимит смены героя: героя нельзя снять, чтобы обойти лимит.
-- 10. Руководитель филиала: после снятия с роли не создаёт заявки.
--
-- Миграцию можно запускать повторно. Выполнять после 0061.

-- =========================================================
-- 1. Финансы и посещаемость остаются после удаления аккаунта
-- =========================================================

alter table public.billing_entries add column if not exists student_name text;
alter table public.attendance add column if not exists student_name text;

alter table public.billing_entries alter column student_id drop not null;
alter table public.billing_entries drop constraint if exists billing_entries_student_id_fkey;
alter table public.billing_entries
  add constraint billing_entries_student_id_fkey
  foreign key (student_id) references public.profiles (id) on delete set null;

alter table public.attendance alter column student_id drop not null;
alter table public.attendance drop constraint if exists attendance_student_id_fkey;
alter table public.attendance
  add constraint attendance_student_id_fkey
  foreign key (student_id) references public.profiles (id) on delete set null;

-- Перед удалением профиля запоминаем имя в его записях, чтобы бухгалтерия
-- и 1С видели, чья это была оплата.
create or replace function public.keep_name_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.billing_entries set student_name = old.full_name where student_id = old.id;
  update public.attendance set student_name = old.full_name where student_id = old.id;
  return old;
end;
$$;
revoke execute on function public.keep_name_on_profile_delete() from public, anon, authenticated;

drop trigger if exists profiles_keep_name_on_delete on public.profiles;
create trigger profiles_keep_name_on_delete
  before delete on public.profiles
  for each row execute function public.keep_name_on_profile_delete();

-- =========================================================
-- Общая проверка: может ли текущий сотрудник работать с учеником
-- =========================================================

create or replace function public.can_manage_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.group_members gm
      where gm.student_id = p_student_id and public.can_manage_group(gm.group_id)
    );
$$;
revoke execute on function public.can_manage_student(uuid) from public, anon;
grant execute on function public.can_manage_student(uuid) to authenticated;

-- Вариант для пути файла в хранилище: папка — id ученика в виде текста.
create or replace function public.can_manage_student_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.group_members gm
      where gm.student_id::text = p_folder and public.can_manage_group(gm.group_id)
    );
$$;
revoke execute on function public.can_manage_student_folder(text) from public, anon;
grant execute on function public.can_manage_student_folder(text) to authenticated;

-- =========================================================
-- 2. Чаты с родителями
-- =========================================================

-- Преподаватель в чате, пока ведёт группу ребёнка (или он администратор).
create or replace function public.is_chat_member(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.parent_chats c
    where c.id = p_chat_id
      and exists (
        select 1 from public.parent_children pc
        where pc.parent_id = c.parent_id and pc.student_id = c.student_id
      )
      and (
        c.parent_id = auth.uid()
        or (
          c.teacher_id = auth.uid()
          and (
            public.is_admin()
            or exists (
              select 1 from public.group_members gm
              join public.groups g on g.id = gm.group_id
              where gm.student_id = c.student_id and g.teacher_id = c.teacher_id
            )
          )
        )
      )
  );
$$;

drop policy if exists "parent_chats_select" on public.parent_chats;
create policy "parent_chats_select" on public.parent_chats
  for select to authenticated using (public.is_chat_member(id));

-- =========================================================
-- 3. Фото и заметки об ученике
-- =========================================================

drop policy if exists "progress_notes_select" on public.progress_notes;
create policy "progress_notes_select" on public.progress_notes
  for select using (
    student_id = auth.uid() or public.is_parent_of(student_id) or public.can_manage_student(student_id)
  );

drop policy if exists "progress_notes_write_staff" on public.progress_notes;
create policy "progress_notes_write_staff" on public.progress_notes
  for all to authenticated
  using (public.can_manage_student(student_id))
  with check (public.can_manage_student(student_id));

drop policy if exists "student_photos_select" on public.student_photos;
create policy "student_photos_select" on public.student_photos
  for select using (
    student_id = auth.uid() or public.is_parent_of(student_id) or public.can_manage_student(student_id)
  );

drop policy if exists "student_photos_write_staff" on public.student_photos;
create policy "student_photos_write_staff" on public.student_photos
  for all to authenticated
  using (public.can_manage_student(student_id))
  with check (public.can_manage_student(student_id));

drop policy if exists "student_photos_bucket_read" on storage.objects;
create policy "student_photos_bucket_read" on storage.objects
  for select using (
    bucket_id = 'student-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_manage_student_folder((storage.foldername(name))[1])
      or exists (
        select 1 from public.parent_children pc
        where pc.student_id::text = (storage.foldername(name))[1]
          and pc.parent_id = auth.uid()
      )
    )
  );

drop policy if exists "student_photos_bucket_insert_staff" on storage.objects;
create policy "student_photos_bucket_insert_staff" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'student-photos' and public.can_manage_student_folder((storage.foldername(name))[1])
  );

drop policy if exists "student_photos_bucket_delete_staff" on storage.objects;
create policy "student_photos_bucket_delete_staff" on storage.objects
  for delete to authenticated using (
    bucket_id = 'student-photos' and public.can_manage_student_folder((storage.foldername(name))[1])
  );

-- =========================================================
-- 4. Объявления
-- =========================================================

drop policy if exists "announcements_write_staff" on public.announcements;
drop policy if exists "announcements_write_admin" on public.announcements;
drop policy if exists "announcements_insert_teacher" on public.announcements;
drop policy if exists "announcements_update_teacher" on public.announcements;
drop policy if exists "announcements_delete_teacher" on public.announcements;

create policy "announcements_write_admin" on public.announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Преподаватель: своей группе или сотрудникам.
create policy "announcements_insert_teacher" on public.announcements
  for insert to authenticated with check (
    public.is_staff()
    and (
      audience = 'staff'
      or (audience = 'group' and group_id is not null and public.can_manage_group(group_id))
    )
  );

-- Менять и удалять — только свои.
create policy "announcements_update_teacher" on public.announcements
  for update to authenticated
  using (public.is_staff() and author_id = auth.uid())
  with check (
    public.is_staff()
    and author_id = auth.uid()
    and (
      audience = 'staff'
      or (audience = 'group' and group_id is not null and public.can_manage_group(group_id))
    )
  );

create policy "announcements_delete_teacher" on public.announcements
  for delete to authenticated using (public.is_staff() and author_id = auth.uid());

-- =========================================================
-- 5. ИИ-проверка сторис: общий лимит с публикациями
-- =========================================================

create or replace function public.claim_story_moderation(
  p_user_id uuid,
  p_story_id uuid,
  p_max_calls int default 20
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls int;
begin
  perform 1 from public.profiles where id = p_user_id for update;

  update public.stories
     set ai_checked_at = now()
   where id = p_story_id and author_id = p_user_id
     and status = 'pending' and ai_checked_at is null;
  if not found then
    return 'skip';
  end if;

  select count(*) into v_calls
    from public.ai_moderation_calls
   where user_id = p_user_id and created_at > now() - interval '24 hours';
  if v_calls >= p_max_calls then
    return 'limit';
  end if;

  insert into public.ai_moderation_calls (user_id, post_id) values (p_user_id, p_story_id);
  return 'ok';
end;
$$;
revoke execute on function public.claim_story_moderation(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.claim_story_moderation(uuid, uuid, int) to service_role;

-- =========================================================
-- 6. Возврат группы после замены
-- =========================================================

-- Когда у группы последний раз менялся преподаватель.
alter table public.groups add column if not exists teacher_changed_at timestamptz;

create or replace function public.stamp_group_teacher_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.teacher_id is distinct from old.teacher_id then
    new.teacher_changed_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_group_teacher_change() from public, anon, authenticated;

drop trigger if exists groups_stamp_teacher_change on public.groups;
create trigger groups_stamp_teacher_change
  before update of teacher_id on public.groups
  for each row execute function public.stamp_group_teacher_change();

create or replace function public.request_group_takeover(p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_teacher uuid;
  v_changed timestamptz;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'staff') then
    raise exception 'insufficient_privilege';
  end if;
  select teacher_id, teacher_changed_at into v_teacher, v_changed
    from public.groups where id = p_group_id for update;
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

  -- Возвращение после замены: группу всё ещё ведёт тот, кто взял её по моему
  -- запросу, и с тех пор администратор её никому не передавал.
  select id into v_id from public.group_teacher_requests
    where group_id = p_group_id and kind = 'replacement' and status = 'approved'
      and requested_by = auth.uid() and taken_by = v_teacher
      and coalesce(v_changed, decided_at) <= decided_at
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

-- =========================================================
-- 7. Филиал ученика
-- =========================================================

create or replace function public.student_in_branch_of_group(p_student_id uuid, p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (public.is_admin() or public.is_branch_admin_of_group(p_group_id))
    and exists (select 1 from public.profiles where id = p_student_id and role::text = 'student')
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

-- =========================================================
-- 8. Опыт героя: посещаемость не видна посторонним
-- =========================================================

create or replace function public.hero_xp(p_student_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week date := public.school_week();
  v_weeks int := 0;
  v_attended int := 0;
  v_streak int := 0;
  v_best int := 0;
  v_drew boolean := false;
  v_close boolean;
begin
  if not public.can_see_profile(p_student_id)
     or not exists (select 1 from public.profiles where id = p_student_id and role::text = 'student') then
    return json_build_object('xp', 0, 'weeks', 0, 'attended', 0, 'streak', 0, 'best_streak', 0, 'drew_this_week', false);
  end if;

  -- Посещаемость видят сам ученик, его родители и сотрудники.
  v_close := p_student_id = auth.uid() or public.is_parent_of(p_student_id) or public.is_staff();

  -- Недели с рисунком и серии подряд идущих недель (gaps and islands).
  with w as (
    select distinct p.weekly_theme_week as wk
      from public.posts p
     where p.author_id = p_student_id
       and p.weekly_theme_week is not null
       and p.status <> 'rejected'
  ),
  runs as (
    select max(wk) as last_wk, count(*)::int as len
      from (select wk, wk - 7 * (row_number() over (order by wk))::int as grp from w) x
     group by grp
  )
  select
    (select count(*)::int from w),
    coalesce((select max(len) from runs), 0),
    coalesce((select len from runs where last_wk >= v_week - 7 order by last_wk desc limit 1), 0),
    exists (select 1 from w where wk = v_week)
  into v_weeks, v_best, v_streak, v_drew;

  if v_close then
    select count(*)::int into v_attended
      from public.attendance a
     where a.student_id = p_student_id
       and a.status in ('present', 'late');
  end if;

  return json_build_object(
    'xp', v_weeks * 50 + v_attended * 10
          + case when v_best >= 4 then 100 else 0 end
          + case when v_best >= 12 then 300 else 0 end,
    'weeks', v_weeks,
    'attended', v_attended,
    'streak', v_streak,
    'best_streak', v_best,
    'drew_this_week', v_drew
  );
end;
$$;

-- =========================================================
-- 9. Героя нельзя снять, чтобы обойти лимит смен
-- =========================================================

create or replace function public.enforce_hero_change_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hero_id is not distinct from old.hero_id then
    return new;
  end if;
  if new.hero_id is null then
    if auth.uid() is not null and not public.is_staff() then
      raise exception 'Героя нельзя снять, его можно только сменить' using errcode = '42501';
    end if;
    return new;
  end if;
  -- Первый выбор героя — не смена.
  if old.hero_id is null then
    return new;
  end if;
  if auth.uid() is not null and not public.is_staff()
     and public.hero_changes_this_year(new.id) >= 3 then
    raise exception 'Героя можно сменить не больше 3 раз в год' using errcode = '42501';
  end if;
  insert into public.hero_changes (student_id, from_hero, to_hero) values (new.id, old.hero_id, new.hero_id);
  return new;
end;
$$;

-- =========================================================
-- 10. Руководитель филиала после снятия с роли
-- =========================================================

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
    delete from public.branch_heads where user_id = new.id;
  end if;
  return new;
end;
$$;

-- Те, кого уже сняли с роли раньше.
delete from public.branch_heads bh
 where not public.is_staff_user(bh.user_id);

drop policy if exists "material_requests_insert" on public.material_requests;
create policy "material_requests_insert" on public.material_requests
  for insert to authenticated with check (
    teacher_id = auth.uid()
    and public.is_staff()
    and exists (select 1 from public.branch_heads where user_id = auth.uid())
  );
