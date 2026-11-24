-- 0058: модерация только у администраторов (решение RR 2026-11-24).
-- Преподаватели (role = 'staff') больше не одобряют, не отклоняют и не
-- удаляют чужие публикации, комментарии, сторис и объявления, не видят
-- жалобы и непроверенные работы. Свои материалы они по-прежнему могут
-- менять и удалять, но их новые публикации тоже проходят проверку.

-- Публикации
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select to authenticated
  using ((author_id = auth.uid()) or public.is_admin()
    or ((status = 'approved'::post_status) and public.can_see_posts_of(author_id)));

drop policy if exists "posts_update_own_or_staff" on public.posts;
create policy "posts_update_own_or_admin" on public.posts for update to authenticated
  using ((author_id = auth.uid()) or public.is_admin());

drop policy if exists "posts_delete_own_or_staff" on public.posts;
create policy "posts_delete_own_or_admin" on public.posts for delete to authenticated
  using ((author_id = auth.uid()) or public.is_admin());

drop policy if exists "post_images_select" on public.post_images;
create policy "post_images_select" on public.post_images for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_images.post_id
    and ((p.author_id = auth.uid()) or public.is_admin()
      or ((p.status = 'approved'::post_status) and public.can_see_posts_of(p.author_id)))));

-- Комментарии
drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select" on public.post_comments for select to authenticated
  using ((exists (select 1 from public.posts p where p.id = post_comments.post_id
      and ((p.status = 'approved'::post_status) or (p.author_id = auth.uid()) or public.is_admin())))
    and (not public.am_blocked_with(author_id)));

drop policy if exists "post_comments_delete_own_or_staff" on public.post_comments;
create policy "post_comments_delete_own_or_admin" on public.post_comments for delete to authenticated
  using ((author_id = auth.uid()) or public.is_admin());

-- Жалобы
drop policy if exists "post_reports_select_own_or_staff" on public.post_reports;
create policy "post_reports_select_own_or_admin" on public.post_reports for select to authenticated
  using ((reporter_id = auth.uid()) or public.is_admin());

drop policy if exists "post_reports_delete_staff" on public.post_reports;
create policy "post_reports_delete_admin" on public.post_reports for delete to authenticated
  using (public.is_admin());

-- Сторис
drop policy if exists "stories_select" on public.stories;
create policy "stories_select" on public.stories for select to authenticated
  using ((author_id = auth.uid()) or public.is_admin()
    or ((status = 'approved'::text) and (expires_at > now())
      and (not public.am_blocked_with(author_id)) and public.can_see_posts_of(author_id)));

drop policy if exists "stories_delete" on public.stories;
create policy "stories_delete" on public.stories for delete to authenticated
  using ((author_id = auth.uid()) or public.is_admin());

-- Продажа работ
drop policy if exists "listings_select" on public.marketplace_listings;
create policy "listings_select" on public.marketplace_listings for select to authenticated
  using ((status = 'approved'::listing_status) or (seller_id = auth.uid()) or public.is_admin());

drop policy if exists "listings_update_own_or_staff" on public.marketplace_listings;
create policy "listings_update_own_or_admin" on public.marketplace_listings for update to authenticated
  using ((seller_id = auth.uid()) or public.is_admin());

drop policy if exists "listings_delete_own_or_staff" on public.marketplace_listings;
create policy "listings_delete_own_or_admin" on public.marketplace_listings for delete to authenticated
  using ((seller_id = auth.uid()) or public.is_admin());

drop policy if exists "listing_images_select" on public.marketplace_listing_images;
create policy "listing_images_select" on public.marketplace_listing_images for select to authenticated
  using (exists (select 1 from public.marketplace_listings l where l.id = marketplace_listing_images.listing_id
    and ((l.status = 'approved'::listing_status) or (l.seller_id = auth.uid()) or public.is_admin())));

-- Триггеры проверки: раньше пропускали всех сотрудников, теперь только
-- администраторов. Иначе преподаватель мог бы сам одобрить свою работу.
do $$
declare
  f text;
  d text;
begin
  foreach f in array array[
    'enforce_post_moderation_fields',
    'protect_post_ai_fields',
    'enforce_post_image_changes',
    'enforce_listing_moderation_fields',
    'enforce_listing_image_changes'
  ] loop
    d := pg_get_functiondef(('public.' || f || '()')::regprocedure);
    if position('public.is_staff()' in d) = 0 then
      raise exception 'is_staff() not found in %', f;
    end if;
    execute replace(d, 'public.is_staff()', 'public.is_admin()');
  end loop;
end $$;
