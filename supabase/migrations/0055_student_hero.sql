-- Персонаж ученика: великий художник, который растёт вместе с ним.
--
-- hero_id — выбранный герой. Стадию роста приложение считает само по группе
-- (Младшая → Средняя → Старшая → 0–6 курс), отдельно хранить её не нужно.
-- hero_power_points — очки силы за конкурсы и выставки:
--   1 очко за участие в уже прошедшем конкурсе или выставке школы,
--   2 очка за достижение (конкурс, выставка, награда), подтверждённое школой,
--   и ещё 2 очка, если это призовое место: 1–3 место, Гран-при, лауреат.
-- Очки видны всем, кто видит профиль ученика (как и его достижения).
--
-- Выполнять после 0052 (от 0053–0054 не зависит). Повторный запуск безопасен.

alter table public.profiles add column if not exists hero_id text;

alter table public.profiles drop constraint if exists profiles_hero_id_check;
alter table public.profiles add constraint profiles_hero_id_check check (
  hero_id is null or hero_id in (
    'kasteyev', 'leonardo', 'michelangelo', 'rembrandt', 'aivazovsky',
    'vangogh', 'monet', 'artemisia', 'serebryakova', 'cassatt',
    'durer', 'raphael', 'sofonisba', 'repin'
  )
);

comment on column public.profiles.hero_id is 'Персонаж ученика (великий художник), см. src/lib/heroes.ts';

create or replace function public.hero_power_points(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
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
