-- Проходы через терминал распознавания лиц (Битрикс24, филиал Ауэзова).
--
-- Функция bitrix-sync забирает новые проходы методом cntl.school.pass.list
-- (по sinceId, до 200 за раз) и складывает их в bitrix_passes. Ученик
-- узнаётся по dealId — ID его карточки в CRM Битрикса, который хранится в
-- списке школы (school_roster.bitrix_deal_id). Фото и биометрия в приложение
-- не попадают: только «ученик прошёл в такое-то время».
--
-- На экране посещаемости ученики с проходом за день отмечаются «Был» сами.
--
-- Выполнять после 0029.

alter table public.school_roster add column if not exists bitrix_deal_id bigint unique;

create table public.bitrix_passes (
  id bigint primary key,             -- ID прохода в Битриксе
  deal_id bigint not null,
  passed_at timestamptz not null,
  registry_no text,
  created_at timestamptz not null default now()
);

create index bitrix_passes_deal_idx on public.bitrix_passes (deal_id, passed_at desc);

-- Читает и пишет только сервер (service role); приложению — group_face_passes.
alter table public.bitrix_passes enable row level security;

create table public.bitrix_sync (
  id int primary key default 1 check (id = 1),
  last_id bigint not null default 1615,
  synced_at timestamptz,
  error text
);

insert into public.bitrix_sync (id) values (1) on conflict do nothing;

alter table public.bitrix_sync enable row level security;

-- Первый проход за день у каждого ученика группы (день — по времени Алматы).
create or replace function public.group_face_passes(p_group_id uuid, p_date date)
returns table (student_id uuid, passed_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_manage_group(p_group_id) then
    raise exception 'insufficient_privilege';
  end if;
  return query
    select gm.student_id, min(p.passed_at)
    from public.group_members gm
    join public.school_roster r on r.student_id = gm.student_id and r.bitrix_deal_id is not null
    join public.bitrix_passes p on p.deal_id = r.bitrix_deal_id
    where gm.group_id = p_group_id
      and (p.passed_at at time zone 'Asia/Almaty')::date = p_date
    group by gm.student_id;
end;
$$;

revoke execute on function public.group_face_passes(uuid, date) from public, anon;
grant execute on function public.group_face_passes(uuid, date) to authenticated;
