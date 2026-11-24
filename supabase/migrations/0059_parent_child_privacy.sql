-- 0059: родитель видит и меняет настройки приватности своего ребёнка
-- (решение RR 2026-11-24). Меняются только два поля из 0051_post_privacy.

create or replace function public.set_child_privacy(
  p_child uuid,
  p_posts_visibility text,
  p_stories_friends_only boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_parent_of(p_child) then
    raise exception 'not_your_child';
  end if;
  if p_posts_visibility not in ('all', 'friends', 'nobody') or p_stories_friends_only is null then
    raise exception 'bad_value';
  end if;
  update public.profiles
     set posts_visibility = p_posts_visibility,
         stories_friends_only = p_stories_friends_only,
         updated_at = now()
   where id = p_child and role::text = 'student';
end;
$$;

revoke execute on function public.set_child_privacy(uuid, text, boolean) from public, anon;
grant execute on function public.set_child_privacy(uuid, text, boolean) to authenticated;
