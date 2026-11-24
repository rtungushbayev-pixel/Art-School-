-- 0060: «Рисунок дня», огонёк серии и опыт героя.
--
-- 1. posts.daily_theme_on — работа нарисована на тему дня (дата по Алматы).
--    Дату ставит сервер: ученик не может «дорисовать» прошлые дни
--    и не может потом поменять дату у готовой работы.
-- 2. hero_xp(student) — опыт героя, считается из данных, без счётчиков,
--    которые можно подкрутить:
--      +20 за каждый день с рисунком дня (кроме отклонённых модерацией);
--      +10 за каждое занятие, где ученик был (есть / опоздал);
--      +50 один раз за серию 7 дней подряд, +200 один раз за 30 дней.
--    Видно тем же, кому виден профиль ученика (can_see_profile), остальным — нули.
--
-- Миграцию можно запускать повторно. Выполнять после 0059.

alter table public.posts
  add column if not exists daily_theme_on date;

comment on column public.posts.daily_theme_on is 'Работа на тему «Рисунок дня»: дата темы (Алматы, UTC+5)';

create index if not exists posts_author_daily_idx
  on public.posts (author_id, daily_theme_on)
  where daily_theme_on is not null;

-- Сегодня по Алматы (Казахстан живёт по UTC+5).
create or replace function public.school_today()
returns date
language sql
stable
as $$
  select ((now() at time zone 'UTC') + interval '5 hours')::date;
$$;

create or replace function public.enforce_post_daily_theme()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.daily_theme_on is not null then
      new.daily_theme_on := public.school_today();
    end if;
  else
    new.daily_theme_on := old.daily_theme_on;
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_post_daily_theme() from public, anon, authenticated;

drop trigger if exists posts_enforce_daily_theme on public.posts;
create trigger posts_enforce_daily_theme
  before insert or update of daily_theme_on on public.posts
  for each row execute function public.enforce_post_daily_theme();

create or replace function public.hero_xp(p_student_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := public.school_today();
  v_days int := 0;
  v_attended int := 0;
  v_streak int := 0;
  v_best int := 0;
  v_drew_today boolean := false;
begin
  if not public.can_see_profile(p_student_id)
     or not exists (select 1 from public.profiles where id = p_student_id and role::text = 'student') then
    return json_build_object('xp', 0, 'daily_days', 0, 'attended', 0, 'streak', 0, 'best_streak', 0, 'drew_today', false);
  end if;

  -- Дни с рисунком дня и серии подряд идущих дней (gaps and islands).
  with d as (
    select distinct p.daily_theme_on as day
      from public.posts p
     where p.author_id = p_student_id
       and p.daily_theme_on is not null
       and p.status <> 'rejected'
  ),
  runs as (
    select min(day) as first_day, max(day) as last_day, count(*)::int as len
      from (select day, day - (row_number() over (order by day))::int as grp from d) x
     group by grp
  )
  select
    (select count(*)::int from d),
    coalesce((select max(len) from runs), 0),
    -- Огонёк горит, если серия закончилась сегодня или вчера.
    coalesce((select len from runs where last_day >= v_today - 1 order by last_day desc limit 1), 0),
    exists (select 1 from d where day = v_today)
  into v_days, v_best, v_streak, v_drew_today;

  select count(*)::int into v_attended
    from public.attendance a
   where a.student_id = p_student_id
     and a.status in ('present', 'late');

  return json_build_object(
    'xp', v_days * 20 + v_attended * 10
          + case when v_best >= 7 then 50 else 0 end
          + case when v_best >= 30 then 200 else 0 end,
    'daily_days', v_days,
    'attended', v_attended,
    'streak', v_streak,
    'best_streak', v_best,
    'drew_today', v_drew_today
  );
end;
$$;

revoke execute on function public.hero_xp(uuid) from public, anon;
grant execute on function public.hero_xp(uuid) to authenticated;
