-- Персонаж ученика: великий художник, который растёт вместе с ним.
--
-- hero_id — выбранный герой. Стадию роста приложение считает само по группе
-- (Младшая → Средняя → Старшая → 0–6 курс), отдельно хранить её не нужно.
-- hero_power_points — очки силы за конкурсы и выставки:
--   1 очко за участие в уже прошедшем конкурсе или выставке школы,
--   2 очка за достижение (конкурс, выставка, награда), подтверждённое школой,
--   и ещё 2 очка, если это призовое место: 1–3 место, Гран-при, лауреат.
-- Очки видны всем, кто видит профиль ученика (как и его достижения).
-- hero_skin — надетый скин героя: base, rare, epic, legendary.
--   Скины открываются за конкурсы (см. hero_progress и src/lib/heroes.ts).
-- hero_progress — разбивка для скинов: участия, призовые места, Гран-при / 1 место.
-- Бакет heroes — картинки героев в полный рост: heroes/{герой}/{уровень}_{скин}.webp.
--   Загружает администратор через Supabase → Storage; читать могут все.
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

alter table public.profiles add column if not exists hero_skin text not null default 'base';
alter table public.profiles drop constraint if exists profiles_hero_skin_check;
alter table public.profiles add constraint profiles_hero_skin_check check (
  hero_skin in ('base', 'rare', 'epic', 'legendary')
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
    select exists (select 1 from public.profiles where id = p_student_id and role::text = 'student') as ok
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

-- Картинки героев.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('heroes', 'heroes', true, 3 * 1024 * 1024, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Список файлов нужен приложению, чтобы знать, какие картинки уже загружены.
drop policy if exists "heroes_read" on storage.objects;
create policy "heroes_read" on storage.objects
  for select to authenticated using (bucket_id = 'heroes');
