-- Родители: прогресс ребёнка и галерея его работ.
--
-- Роль parent назначает сотрудник через set_user_role (как и роль staff),
-- он же привязывает родителя к детям. Сам себе стать родителем или
-- привязаться к чужому ребёнку пользователь не может.
--
-- Родитель видит только своих детей: их посещаемость, записи преподавателей
-- о прогрессе, все их работы (включая ещё не прошедшие модерацию) и
-- объявления групп, в которых учатся дети, а также фото, которые
-- преподаватель загрузил в галерею ребёнка (закрытый бакет student-photos).
--
-- Новое значение enum нельзя использовать в той же транзакции, где оно
-- добавлено, а SQL Editor выполняет скрипт одной транзакцией. Поэтому ниже
-- роль сравнивается как текст (role::text = 'parent'), а не как enum.

alter type public.user_role add value if not exists 'parent';

-- =========================================================
-- ПРИВЯЗКА РОДИТЕЛЬ → РЕБЁНОК
-- =========================================================

create table public.parent_children (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id),
  check (parent_id <> student_id)
);

create index parent_children_student_idx on public.parent_children (student_id);

-- Привязать можно только родителя к ученику.
create function public.check_parent_child_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = new.parent_id and role::text = 'parent') then
    raise exception 'parent_id must have role parent';
  end if;
  if not exists (select 1 from public.profiles where id = new.student_id and role::text = 'student') then
    raise exception 'student_id must have role student';
  end if;
  return new;
end;
$$;

create trigger parent_children_check_roles
  before insert or update on public.parent_children
  for each row execute procedure public.check_parent_child_roles();

-- Текущий пользователь — родитель этого ученика. Проверяется и роль, поэтому
-- если сотрудник снимет с человека роль родителя, доступ к детям пропадёт
-- сразу, даже если привязки остались.
create function public.is_parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_children pc
    join public.profiles p on p.id = pc.parent_id
    where pc.parent_id = auth.uid()
      and pc.student_id = p_student_id
      and p.role::text = 'parent'
  );
$$;

alter table public.parent_children enable row level security;

create policy "parent_children_select" on public.parent_children
  for select using (parent_id = auth.uid() or student_id = auth.uid() or public.is_staff());

create policy "parent_children_write_staff" on public.parent_children
  for all using (public.is_staff()) with check (public.is_staff());

-- =========================================================
-- ПРОГРЕСС: записи преподавателей об ученике
-- =========================================================

create table public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index progress_notes_student_idx on public.progress_notes (student_id, created_at desc);

-- Автор записи — всегда тот, кто её создал, подделать его через API нельзя.
create function public.set_progress_note_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger progress_notes_set_author
  before insert on public.progress_notes
  for each row execute procedure public.set_progress_note_author();

alter table public.progress_notes enable row level security;

create policy "progress_notes_select" on public.progress_notes
  for select using (
    public.is_staff() or student_id = auth.uid() or public.is_parent_of(student_id)
  );

create policy "progress_notes_write_staff" on public.progress_notes
  for all using (public.is_staff()) with check (public.is_staff());

-- =========================================================
-- ДОСТУП РОДИТЕЛЯ К ДАННЫМ РЕБЁНКА
-- Политики дополняют существующие (RLS объединяет их через OR).
-- =========================================================

create policy "attendance_select_parent" on public.attendance
  for select using (public.is_parent_of(student_id));

-- Галерея: родитель видит все работы ребёнка, в том числе на модерации.
create policy "posts_select_parent" on public.posts
  for select using (public.is_parent_of(author_id));

create policy "post_images_select_parent" on public.post_images
  for select using (
    exists (select 1 from public.posts p where p.id = post_id and public.is_parent_of(p.author_id))
  );

-- Объявления групп, в которых учится ребёнок.
create policy "announcements_select_parent" on public.announcements
  for select using (
    audience = 'group'
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = announcements.group_id and public.is_parent_of(gm.student_id)
    )
  );

-- =========================================================
-- ГАЛЕРЕЯ: фото, которые загружает преподаватель
-- (процесс на занятии, работы, которые ребёнок не публикует сам).
-- Бакет закрытый: фото детей доступны только по временной ссылке
-- сотрудникам, самому ученику и его родителям.
-- Путь файла: {student_id}/{имя файла}.
-- =========================================================

create table public.student_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index student_photos_student_idx on public.student_photos (student_id, created_at desc);

create function public.set_student_photo_uploader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.uploaded_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger student_photos_set_uploader
  before insert on public.student_photos
  for each row execute procedure public.set_student_photo_uploader();

alter table public.student_photos enable row level security;

create policy "student_photos_select" on public.student_photos
  for select using (
    public.is_staff() or student_id = auth.uid() or public.is_parent_of(student_id)
  );

create policy "student_photos_write_staff" on public.student_photos
  for all using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict (id) do nothing;

-- Имя папки сравнивается как текст, чтобы файл с «кривым» путём не ломал
-- запрос ошибкой приведения к uuid.
create policy "student_photos_bucket_read" on storage.objects
  for select using (
    bucket_id = 'student-photos'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.parent_children pc
        where pc.student_id::text = (storage.foldername(name))[1]
          and public.is_parent_of(pc.student_id)
      )
    )
  );

create policy "student_photos_bucket_insert_staff" on storage.objects
  for insert with check (bucket_id = 'student-photos' and public.is_staff());

create policy "student_photos_bucket_delete_staff" on storage.objects
  for delete using (bucket_id = 'student-photos' and public.is_staff());
