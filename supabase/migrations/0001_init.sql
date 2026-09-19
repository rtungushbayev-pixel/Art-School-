-- Школа искусств и дизайна им. А. Кастеева — начальная схема базы данных
-- Роли: student (ученик), staff (руководство/преподаватель)

create extension if not exists "pgcrypto";

-- =========================================================
-- ПРОФИЛИ
-- =========================================================

create type user_role as enum ('student', 'staff');
create type enrollment_status as enum ('planning', 'applied', 'enrolled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null default '',
  avatar_url text,
  bio text,
  phone text,
  -- "куда поступил / планирует поступать" для профиля ученика
  target_institution text,
  target_institution_status enrollment_status,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.target_institution is 'ВУЗ/колледж, куда ученик поступил или планирует поступать';

-- =========================================================
-- ГРУППЫ (классы/студии)
-- =========================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

-- =========================================================
-- РАСПИСАНИЕ
-- =========================================================

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  room text,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ДОМАШНИЕ ЗАДАНИЯ
-- =========================================================

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  description text,
  attachment_url text,
  due_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create type submission_status as enum ('submitted', 'reviewed');

create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  attachment_url text,
  status submission_status not null default 'submitted',
  feedback text,
  grade smallint,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (homework_id, student_id)
);

-- =========================================================
-- ПОРТФОЛИО / ЛЕНТА (посты с фото, лайки, комментарии)
-- =========================================================

create type post_status as enum ('pending', 'approved', 'rejected');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  caption text,
  status post_status not null default 'pending',
  moderated_by uuid references public.profiles (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  image_url text not null,
  position smallint not null default 0
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ОБЪЯВЛЕНИЯ
-- =========================================================

create type announcement_audience as enum ('all', 'students', 'staff', 'group');

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_id uuid references public.profiles (id) on delete set null,
  audience announcement_audience not null default 'all',
  group_id uuid references public.groups (id) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ПОСЕЩАЕМОСТЬ
-- =========================================================

create type attendance_status as enum ('present', 'absent', 'late', 'excused');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_date date not null,
  status attendance_status not null default 'present',
  marked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (group_id, student_id, lesson_date, lesson_id)
);

-- =========================================================
-- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
-- =========================================================

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff'
  );
$$;

create function public.is_group_member(check_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = check_group_id and student_id = auth.uid()
  );
$$;

-- Автосоздание профиля при регистрации пользователя
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.lessons enable row level security;
alter table public.homework enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.announcements enable row level security;
alter table public.attendance enable row level security;

-- profiles: все авторизованные видят все профили (соцфункции),
-- редактировать может только владелец; роль назначает только staff
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- groups: читать могут все авторизованные, создавать/менять — staff
create policy "groups_select_all" on public.groups
  for select using (auth.role() = 'authenticated');

create policy "groups_write_staff" on public.groups
  for all using (public.is_staff()) with check (public.is_staff());

create policy "group_members_select_all" on public.group_members
  for select using (auth.role() = 'authenticated');

create policy "group_members_write_staff" on public.group_members
  for all using (public.is_staff()) with check (public.is_staff());

-- lessons: читать все, писать — staff
create policy "lessons_select_all" on public.lessons
  for select using (auth.role() = 'authenticated');

create policy "lessons_write_staff" on public.lessons
  for all using (public.is_staff()) with check (public.is_staff());

-- homework: читать все участники группы + staff, писать — staff
create policy "homework_select" on public.homework
  for select using (public.is_staff() or public.is_group_member(group_id));

create policy "homework_write_staff" on public.homework
  for all using (public.is_staff()) with check (public.is_staff());

-- homework_submissions: ученик видит/создаёт свои, staff видит и оценивает все
create policy "submissions_select_own_or_staff" on public.homework_submissions
  for select using (auth.uid() = student_id or public.is_staff());

create policy "submissions_insert_own" on public.homework_submissions
  for insert with check (auth.uid() = student_id);

create policy "submissions_update_own_or_staff" on public.homework_submissions
  for update using (auth.uid() = student_id or public.is_staff());

-- posts: одобренные видят все, автор видит свои в любом статусе, staff видит всё
create policy "posts_select" on public.posts
  for select using (
    status = 'approved' or author_id = auth.uid() or public.is_staff()
  );

create policy "posts_insert_own" on public.posts
  for insert with check (author_id = auth.uid());

create policy "posts_update_own_or_staff" on public.posts
  for update using (author_id = auth.uid() or public.is_staff());

create policy "posts_delete_own_or_staff" on public.posts
  for delete using (author_id = auth.uid() or public.is_staff());

-- post_images: наследуют видимость поста
create policy "post_images_select" on public.post_images
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.status = 'approved' or p.author_id = auth.uid() or public.is_staff())
    )
  );

create policy "post_images_write_own" on public.post_images
  for all using (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- лайки и комментарии — только на одобренных постах
create policy "post_likes_select" on public.post_likes
  for select using (auth.role() = 'authenticated');

create policy "post_likes_write_own" on public.post_likes
  for all using (auth.uid() = user_id) with check (
    auth.uid() = user_id and exists (
      select 1 from public.posts p where p.id = post_id and p.status = 'approved'
    )
  );

create policy "post_comments_select" on public.post_comments
  for select using (auth.role() = 'authenticated');

create policy "post_comments_insert_own" on public.post_comments
  for insert with check (
    auth.uid() = author_id and exists (
      select 1 from public.posts p where p.id = post_id and p.status = 'approved'
    )
  );

create policy "post_comments_delete_own_or_staff" on public.post_comments
  for delete using (author_id = auth.uid() or public.is_staff());

-- announcements: читать все, писать — staff
create policy "announcements_select_all" on public.announcements
  for select using (auth.role() = 'authenticated');

create policy "announcements_write_staff" on public.announcements
  for all using (public.is_staff()) with check (public.is_staff());

-- attendance: ученик видит свою, staff видит и отмечает всё
create policy "attendance_select_own_or_staff" on public.attendance
  for select using (auth.uid() = student_id or public.is_staff());

create policy "attendance_write_staff" on public.attendance
  for all using (public.is_staff()) with check (public.is_staff());
