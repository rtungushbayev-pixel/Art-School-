-- Приватность ученика (Профиль → Настройки профиля):
--   «Кто видит мои публикации»: все / только друзья / скрыть от всех;
--   «Сторис только от друзей»: в кружках над лентой только друзья.
--
-- Видимость публикаций проверяет база: чужие публикации и их фото видны,
-- только если автор это разрешил. Автор, сотрудники и привязанные родители
-- видят всегда (родители — через отдельные политики из 0012). То же
-- правило действует и на сторис автора. Комментарии и лайки берут
-- видимость из публикации.
--
-- Выполнять после 0050.

alter table public.profiles
  add column posts_visibility text not null default 'all'
    check (posts_visibility in ('all', 'friends', 'nobody')),
  add column stories_friends_only boolean not null default false;

-- Может ли текущий пользователь видеть публикации и сторис автора.
create function public.can_see_posts_of(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case coalesce((select posts_visibility from public.profiles where id = p_author), 'all')
    when 'all' then true
    when 'friends' then exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = p_author)
          or (f.addressee_id = auth.uid() and f.requester_id = p_author))
    )
    else false
  end;
$$;

revoke execute on function public.can_see_posts_of(uuid) from public, anon;
grant execute on function public.can_see_posts_of(uuid) to authenticated;

drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select to authenticated using (
    author_id = auth.uid()
    or public.is_staff()
    or (status = 'approved' and public.can_see_posts_of(author_id))
  );

drop policy if exists "post_images_select" on public.post_images;
create policy "post_images_select" on public.post_images
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      where p.id = post_images.post_id
        and (
          p.author_id = auth.uid()
          or public.is_staff()
          or (p.status = 'approved' and public.can_see_posts_of(p.author_id))
        )
    )
  );

drop policy if exists "stories_select" on public.stories;
create policy "stories_select" on public.stories
  for select to authenticated using (
    author_id = auth.uid()
    or public.is_staff()
    or (
      status = 'approved'
      and expires_at > now()
      and not public.am_blocked_with(author_id)
      and public.can_see_posts_of(author_id)
    )
  );
