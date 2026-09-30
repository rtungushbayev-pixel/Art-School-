-- Закрывает оставшиеся утечки данных между пользователями.
--
-- 1) profiles.phone видели все авторизованные пользователи (профили открыты
--    для соцфункций), то есть через API можно было выгрузить телефоны всей
--    школы. Телефон переезжает в profile_private, где его видит только
--    владелец и сотрудники.
--
-- 2) Ученик мог сдать работу (или перенести сдачу) к заданию чужой группы:
--    политики homework_submissions проверяли только student_id.
--
-- 3) Бакет homework был публичным: файлы домашних работ открывались по
--    прямой ссылке без входа. Приложение этот бакет пока не использует,
--    поэтому делаем его приватным сразу. Файл может читать его владелец и
--    сотрудники; файлы, загруженные сотрудниками (вложения к заданиям), —
--    любой авторизованный пользователь. Ссылки — через createSignedUrl.

-- =========================================================
-- PROFILE_PRIVATE: личные контакты
-- =========================================================

create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

create policy "profile_private_select_own_or_staff" on public.profile_private
  for select using (user_id = auth.uid() or public.is_staff());

create policy "profile_private_insert_own" on public.profile_private
  for insert with check (user_id = auth.uid());

create policy "profile_private_update_own" on public.profile_private
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.profile_private (user_id, phone)
select id, phone from public.profiles where phone is not null;

alter table public.profiles drop column phone;

-- =========================================================
-- HOMEWORK_SUBMISSIONS: только к заданиям своей группы
-- =========================================================

drop policy "submissions_insert_own" on public.homework_submissions;
drop policy "submissions_update_own_or_staff" on public.homework_submissions;

create policy "submissions_insert_own" on public.homework_submissions
  for insert with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.homework h
      where h.id = homework_id and public.is_group_member(h.group_id)
    )
  );

create policy "submissions_update_own_or_staff" on public.homework_submissions
  for update
  using (auth.uid() = student_id or public.is_staff())
  with check (
    public.is_staff()
    or (
      auth.uid() = student_id
      and exists (
        select 1 from public.homework h
        where h.id = homework_id and public.is_group_member(h.group_id)
      )
    )
  );

-- =========================================================
-- STORAGE: приватный бакет homework
-- =========================================================

update storage.buckets set public = false where id = 'homework';

drop policy "homework_bucket_public_read" on storage.objects;

create policy "homework_bucket_owner_or_staff_read" on storage.objects
  for select using (
    bucket_id = 'homework'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
      or exists (
        select 1 from public.profiles p
        where p.id::text = (storage.foldername(name))[1] and p.role = 'staff'
      )
    )
  );
