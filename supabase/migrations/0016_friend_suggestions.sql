-- «Возможно, вы их знаете» в разделе «Друзья».
--
-- Подсказки строятся без геолокации: люди из тех же групп (одноклассники
-- и преподаватель группы) и друзья друзей. Чужие дружбы и состав групп
-- клиенту напрямую не отдаются: функция возвращает только id подсказанных
-- людей, число общих друзей и признак общей группы.

create function public.friend_suggestions(p_limit int default 20)
returns table (user_id uuid, mutual_friends int, same_group boolean)
language sql
stable
security definer
set search_path = public
as $$
  with my_friends as (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as fid
    from public.friendships f
    where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  ),
  friends_of_friends as (
    select
      case when f.requester_id = mf.fid then f.addressee_id else f.requester_id end as uid,
      count(*)::int as mutual
    from public.friendships f
    join my_friends mf on mf.fid in (f.requester_id, f.addressee_id)
    where f.status = 'accepted'
    group by 1
  ),
  my_groups as (
    select group_id from public.group_members where student_id = auth.uid()
    union
    select id from public.groups where teacher_id = auth.uid()
  ),
  group_mates as (
    select gm.student_id as uid from public.group_members gm join my_groups g on g.group_id = gm.group_id
    union
    select gr.teacher_id from public.groups gr join my_groups g on g.group_id = gr.id where gr.teacher_id is not null
  ),
  candidates as (
    select uid from friends_of_friends
    union
    select uid from group_mates
  )
  select
    c.uid,
    coalesce(fof.mutual, 0),
    exists (select 1 from group_mates gm where gm.uid = c.uid)
  from candidates c
  left join friends_of_friends fof on fof.uid = c.uid
  where auth.uid() is not null
    and public.can_have_friends(auth.uid())
    and c.uid <> auth.uid()
    and public.can_have_friends(c.uid)
    and not exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = c.uid)
         or (f.requester_id = c.uid and f.addressee_id = auth.uid())
    )
    and not public.is_blocked_between(auth.uid(), c.uid)
  order by 2 desc, 3 desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke execute on function public.friend_suggestions(int) from public, anon;
grant execute on function public.friend_suggestions(int) to authenticated;
