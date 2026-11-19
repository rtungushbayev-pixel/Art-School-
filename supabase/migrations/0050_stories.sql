-- Сторис в Комьюнити: фото, которое видно 24 часа.
--
-- Ученик или сотрудник выкладывает фото (родители только смотрят). Сторис
-- сразу проверяет ИИ (функция moderate-story) по тем же правилам, что и
-- публикации: пока проверка не прошла, сторис видит только автор и
-- сотрудники. Через 24 часа сторис пропадает из ленты, а функция
-- moderate-story при следующих вызовах удаляет старые файлы и записи,
-- поэтому место в хранилище не копится.
--
-- Выполнять после 0039 (am_blocked_with из 0025).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', true, 5 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

-- Загрузка и удаление только в своей папке {uid}/...; удаляет файлы и функция (service role).
create policy "stories_owner_write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Чтение своей папки нужно, чтобы удаление через API находило файл.
create policy "stories_owner_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "stories_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text
  );

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  image_path text not null check (length(image_path) between 3 and 300),
  image_url text not null check (length(image_url) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ai_reason text,
  ai_checked_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index stories_active_idx on public.stories (expires_at desc) where status = 'approved';
create index stories_author_idx on public.stories (author_id, created_at desc);

alter table public.stories enable row level security;

-- Видно: свои — всегда (пока не удалены), чужие — одобренные, живые и без блокировки.
create policy "stories_select" on public.stories
  for select to authenticated using (
    author_id = auth.uid()
    or public.is_staff()
    or (status = 'approved' and expires_at > now() and not public.am_blocked_with(author_id))
  );

-- Выкладывают ученики и сотрудники, не больше 10 сторис в сутки, файл — из своей папки.
create function public.can_add_story()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
      select 1 from public.profiles where id = auth.uid() and role::text in ('student', 'staff', 'admin')
    )
    and (
      select count(*) from public.stories
      where author_id = auth.uid() and created_at > now() - interval '24 hours'
    ) < 10;
$$;

create policy "stories_insert" on public.stories
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'pending'
    and ai_reason is null
    and ai_checked_at is null
    and split_part(image_path, '/', 1) = auth.uid()::text
    and public.can_add_story()
  );

-- Удаляет автор или сотрудник. Менять сторис нельзя (решение пишет только функция).
create policy "stories_delete" on public.stories
  for delete to authenticated using (author_id = auth.uid() or public.is_staff());

-- Новая сторис всегда живёт 24 часа от момента публикации.
create function public.stories_set_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  return new;
end;
$$;

create trigger stories_set_expiry
  before insert on public.stories
  for each row execute procedure public.stories_set_expiry();

-- Кто какие сторис уже посмотрел: серое кольцо вместо цветного и счётчик для автора.
create table public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.story_views enable row level security;

create policy "story_views_insert_own" on public.story_views
  for insert to authenticated with check (viewer_id = auth.uid());

create policy "story_views_select" on public.story_views
  for select to authenticated using (
    viewer_id = auth.uid()
    or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );
