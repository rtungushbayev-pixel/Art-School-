-- 0056: доработки безопасности персонажа ученика (после 0055).
--
-- 1. hero_power_points и hero_progress отдают очки и призы ученика только тем,
--    кому виден его профиль (can_see_profile), остальным — нули.
-- 2. Облик героя (hero_skin) нельзя надеть в обход приложения: триггер
--    проверяет, что облик открыт за конкурсы (те же правила, что в
--    src/lib/heroes.ts → skinUnlocked). Сотрудники и сервер могут менять свободно.
--
-- Миграцию можно запускать повторно. Выполнять после 0055.

create or replace function public.hero_power_points(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_see_profile(p_student_id) then 0
    when not exists (select 1 from public.profiles where id = p_student_id and role::text = 'student') then 0
    else (
      (select count(*)::int
         from public.event_registrations r
         join public.school_events e on e.id = r.event_id
        where r.student_id = p_student_id
          and e.kind in ('competition', 'exhibition')
          and coalesce(e.ends_on, e.starts_on) < current_date)
      + (select coalesce(sum(
           2 + case
             when a.result ~* '(^|[^0-9])[123]\s*-?\s*(е|-е)?\s*мест|гран|лауреат|(^|[^0-9])[123]\s*(place|орын)|grand'
             then 2 else 0 end
         ), 0)::int
         from public.student_achievements a
        where a.student_id = p_student_id
          and a.verified
          and a.kind::text in ('competition', 'exhibition', 'award'))
    )
  end;
$$;

revoke execute on function public.hero_power_points(uuid) from public, anon;
grant execute on function public.hero_power_points(uuid) to authenticated;

-- Разбивка для скинов. Призовое место: 1–3 место, Гран-при, лауреат.
-- «Вершина»: Гран-при или 1 место.
create or replace function public.hero_progress(p_student_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with
  student as (
    select public.can_see_profile(p_student_id)
       and exists (select 1 from public.profiles where id = p_student_id and role::text = 'student') as ok
  ),
  regs as (
    select count(*)::int as n
      from public.event_registrations r
      join public.school_events e on e.id = r.event_id
     where r.student_id = p_student_id
       and e.kind in ('competition', 'exhibition')
       and coalesce(e.ends_on, e.starts_on) < current_date
  ),
  ach as (
    select
      count(*)::int as n,
      count(*) filter (
        where a.result ~* '(^|[^0-9])[123]\s*-?\s*(е|-е)?\s*мест|гран|лауреат|(^|[^0-9])[123]\s*(place|орын)|grand'
      )::int as prizes,
      count(*) filter (
        where a.result ~* 'гран|grand|(^|[^0-9])1\s*-?\s*(е|-е)?\s*мест|(^|[^0-9])1\s*(place|орын)'
      )::int as top
      from public.student_achievements a
     where a.student_id = p_student_id
       and a.verified
       and a.kind::text in ('competition', 'exhibition', 'award')
  )
  select case when not (select ok from student) then
    json_build_object('participations', 0, 'achievements', 0, 'prizes', 0, 'top', 0, 'points', 0)
  else json_build_object(
    'participations', (select n from regs),
    'achievements', (select n from ach),
    'prizes', (select prizes from ach),
    'top', (select top from ach),
    'points', public.hero_power_points(p_student_id)
  ) end;
$$;

revoke execute on function public.hero_progress(uuid) from public, anon;
grant execute on function public.hero_progress(uuid) to authenticated;

-- Облик открыт? base — всем; rare — хотя бы одно участие или достижение;
-- epic — призовое место; legendary — Гран-при или 1 место.
create or replace function public.enforce_hero_skin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p json;
begin
  if new.hero_skin is null or new.hero_skin = 'base' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.hero_skin is not distinct from old.hero_skin then
    return new;
  end if;
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;
  p := public.hero_progress(new.id);
  if (new.hero_skin = 'rare' and (p->>'participations')::int + (p->>'achievements')::int >= 1)
     or (new.hero_skin = 'epic' and (p->>'prizes')::int >= 1)
     or (new.hero_skin = 'legendary' and (p->>'top')::int >= 1) then
    return new;
  end if;
  raise exception 'Этот облик героя ещё не открыт' using errcode = '42501';
end;
$$;

revoke execute on function public.enforce_hero_skin() from public, anon, authenticated;

drop trigger if exists profiles_enforce_hero_skin on public.profiles;
create trigger profiles_enforce_hero_skin
  before insert or update of hero_skin on public.profiles
  for each row execute function public.enforce_hero_skin();
