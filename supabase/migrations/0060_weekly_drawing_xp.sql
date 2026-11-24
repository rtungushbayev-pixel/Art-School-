-- 0060: «Рисунок недели», огонёк серии недель и опыт героя.
--
-- Ученики параллельно учатся в обычной школе, поэтому тема даётся на неделю
-- (понедельник – воскресенье по Алматы), а не на день.
--
-- 1. posts.weekly_theme_week — работа на тему недели: понедельник этой недели.
--    Дату ставит сервер: прошлые недели «дорисовать» нельзя, и у готовой
--    работы неделю не поменять.
-- 2. hero_xp(student) — опыт героя, считается из данных, без счётчиков,
--    которые можно подкрутить:
--      +50 за каждую неделю с рисунком недели (кроме отклонённых модерацией);
--      +10 за каждое занятие, где ученик был (есть / опоздал);
--      +100 один раз за 4 недели подряд, +300 один раз за 12 недель подряд.
--    Видно тем же, кому виден профиль ученика (can_see_profile), остальным — нули.
--
-- Миграцию можно запускать повторно. Выполнять после 0059.

-- Ранняя версия этой миграции была про «рисунок дня» — убираем её следы.
drop trigger if exists posts_enforce_daily_theme on public.posts;
drop function if exists public.enforce_post_daily_theme();
drop index if exists public.posts_author_daily_idx;
alter table public.posts drop column if exists daily_theme_on;

alter table public.posts
  add column if not exists weekly_theme_week date;

comment on column public.posts.weekly_theme_week is 'Работа на тему «Рисунок недели»: понедельник недели (Алматы, UTC+5)';

create index if not exists posts_author_weekly_idx
  on public.posts (author_id, weekly_theme_week)
  where weekly_theme_week is not null;

-- Сегодня по Алматы (Казахстан живёт по UTC+5).
create or replace function public.school_today()
returns date
language sql
stable
as $$
  select ((now() at time zone 'UTC') + interval '5 hours')::date;
$$;

-- Понедельник текущей недели по Алматы.
create or replace function public.school_week()
returns date
language sql
stable
as $$
  select date_trunc('week', public.school_today())::date;
$$;

create or replace function public.enforce_post_weekly_theme()
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
    if new.weekly_theme_week is not null then
      new.weekly_theme_week := public.school_week();
    end if;
  else
    new.weekly_theme_week := old.weekly_theme_week;
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_post_weekly_theme() from public, anon, authenticated;

drop trigger if exists posts_enforce_weekly_theme on public.posts;
create trigger posts_enforce_weekly_theme
  before insert or update of weekly_theme_week on public.posts
  for each row execute function public.enforce_post_weekly_theme();

create or replace function public.hero_xp(p_student_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week date := public.school_week();
  v_weeks int := 0;
  v_attended int := 0;
  v_streak int := 0;
  v_best int := 0;
  v_drew boolean := false;
begin
  if not public.can_see_profile(p_student_id)
     or not exists (select 1 from public.profiles where id = p_student_id and role::text = 'student') then
    return json_build_object('xp', 0, 'weeks', 0, 'attended', 0, 'streak', 0, 'best_streak', 0, 'drew_this_week', false);
  end if;

  -- Недели с рисунком и серии подряд идущих недель (gaps and islands).
  with w as (
    select distinct p.weekly_theme_week as wk
      from public.posts p
     where p.author_id = p_student_id
       and p.weekly_theme_week is not null
       and p.status <> 'rejected'
  ),
  runs as (
    select max(wk) as last_wk, count(*)::int as len
      from (select wk, wk - 7 * (row_number() over (order by wk))::int as grp from w) x
     group by grp
  )
  select
    (select count(*)::int from w),
    coalesce((select max(len) from runs), 0),
    -- Огонёк горит, если серия дошла до этой или прошлой недели.
    coalesce((select len from runs where last_wk >= v_week - 7 order by last_wk desc limit 1), 0),
    exists (select 1 from w where wk = v_week)
  into v_weeks, v_best, v_streak, v_drew;

  select count(*)::int into v_attended
    from public.attendance a
   where a.student_id = p_student_id
     and a.status in ('present', 'late');

  return json_build_object(
    'xp', v_weeks * 50 + v_attended * 10
          + case when v_best >= 4 then 100 else 0 end
          + case when v_best >= 12 then 300 else 0 end,
    'weeks', v_weeks,
    'attended', v_attended,
    'streak', v_streak,
    'best_streak', v_best,
    'drew_this_week', v_drew
  );
end;
$$;

revoke execute on function public.hero_xp(uuid) from public, anon;
grant execute on function public.hero_xp(uuid) to authenticated;
