-- Профиль и портфолио ученика.
--
-- 1) В профиле ученика появляются направление (живопись, графика, дизайн…)
--    и год, с которого он учится в школе.
--
-- 2) Работы в ленте (posts) становятся полноценными экспонатами портфолио:
--    название, техника/материалы, год создания и отметка «избранное» —
--    избранные работы показываются первыми в портфолио ученика.
--    Если автор меняет текст уже проверенной работы (подпись, название,
--    технику), работа снова уходит на модерацию — иначе можно было бы
--    поменять текст после одобрения в обход проверки. Отметка «избранное»
--    и год на модерацию не отправляют.
--
-- 3) Достижения ученика: конкурсы, выставки, награды. Добавляет сам ученик
--    или сотрудник; отметку «подтверждено школой» ставит только сотрудник,
--    и она снимается, если ученик потом меняет запись.

-- =========================================================
-- PROFILES: направление и год начала обучения
-- =========================================================

alter table public.profiles
  add column specialization text check (char_length(specialization) <= 100),
  add column study_since smallint check (study_since between 1950 and 2100);

comment on column public.profiles.specialization is 'Направление ученика: живопись, графика, дизайн и т. п.';
comment on column public.profiles.study_since is 'Год, с которого ученик учится в школе';

-- =========================================================
-- POSTS: сведения о работе для портфолио
-- =========================================================

alter table public.posts
  add column title text check (char_length(title) <= 120),
  add column technique text check (char_length(technique) <= 120),
  add column artwork_year smallint check (artwork_year between 1950 and 2100),
  add column featured boolean not null default false;

comment on column public.posts.title is 'Название работы';
comment on column public.posts.technique is 'Техника и материалы, например «акварель, бумага»';
comment on column public.posts.artwork_year is 'Год создания работы';
comment on column public.posts.featured is 'Работа закреплена автором в начале портфолио';

create index posts_author_featured_idx on public.posts (author_id, featured desc, created_at desc);

-- Дополняет триггер из 0005: прежняя защита от самомодерации остаётся,
-- плюс повторная модерация при изменении текста проверенной работы.
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
    elsif tg_op = 'UPDATE' then
      if old.status <> 'pending' and (
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

-- =========================================================
-- STUDENT_ACHIEVEMENTS: конкурсы, выставки, награды
-- =========================================================

create type achievement_kind as enum ('competition', 'exhibition', 'award', 'other');

create table public.student_achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  kind achievement_kind not null default 'competition',
  title text not null check (char_length(title) between 1 and 200),
  result text check (char_length(result) <= 100),
  event_date date,
  verified boolean not null default false,
  verified_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

comment on column public.student_achievements.result is 'Итог: «1 место», «Гран-при», «участник» и т. п.';
comment on column public.student_achievements.verified is 'Подтверждено сотрудником школы';

create index student_achievements_student_idx on public.student_achievements (student_id, event_date desc);

alter table public.student_achievements enable row level security;

-- Видны всем авторизованным, как и сам профиль
create policy "achievements_select_all" on public.student_achievements
  for select using (auth.role() = 'authenticated');

create policy "achievements_insert_own_or_staff" on public.student_achievements
  for insert with check (student_id = auth.uid() or public.is_staff());

create policy "achievements_update_own_or_staff" on public.student_achievements
  for update using (student_id = auth.uid() or public.is_staff())
  with check (student_id = auth.uid() or public.is_staff());

create policy "achievements_delete_own_or_staff" on public.student_achievements
  for delete using (student_id = auth.uid() or public.is_staff());

-- Ученик не может сам себе поставить «подтверждено», не может переписать
-- запись на другого ученика, а любое его изменение снимает подтверждение.
create function public.enforce_achievement_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_staff() then
    if new.verified then
      if tg_op = 'INSERT' or not old.verified then
        new.verified_by := auth.uid();
      else
        new.verified_by := old.verified_by;
      end if;
    else
      new.verified_by := null;
    end if;
  else
    new.verified := false;
    new.verified_by := null;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.student_id := old.student_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger achievements_enforce_fields
  before insert or update on public.student_achievements
  for each row execute procedure public.enforce_achievement_fields();
