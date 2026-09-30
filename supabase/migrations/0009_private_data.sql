-- Закрывает оставшиеся утечки данных между пользователями.
--
-- 1) profiles.phone видели все авторизованные пользователи (профили открыты
--    для соцфункций), то есть через API можно было выгрузить телефоны всей
--    школы. Телефон переезжает в profile_private, где его видит только
--    владелец и сотрудники.
--
-- 2) Домашние задания и сдача работ убраны из приложения ещё раньше, и
--    школа не будет проверять работы учеников в приложении. Таблицы
--    homework / homework_submissions оставались в базе с RLS-политиками,
--    через которые ученик мог писать в них напрямую через API, а бакет
--    homework был публичным. Удаляем таблицы целиком (вместе с данными)
--    и закрываем бакет: все политики сняты, доступ есть только у service
--    role. Сам бакет удаляется вручную в Dashboard → Storage.

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
-- ДОМАШНИЕ ЗАДАНИЯ И СДАЧА РАБОТ: удаление
-- =========================================================

drop table public.homework_submissions;
drop function public.enforce_submission_review_fields();
drop type public.submission_status;
drop table public.homework;

update storage.buckets set public = false where id = 'homework';

drop policy "homework_bucket_public_read" on storage.objects;
drop policy "homework_bucket_owner_write" on storage.objects;
drop policy "homework_bucket_owner_update" on storage.objects;
drop policy "homework_bucket_owner_delete" on storage.objects;
