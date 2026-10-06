-- Посещаемость возвращается в приложение.
--
-- Преподаватель группы (или администратор) отмечает учеников за день:
-- «Был», «Опоздал», «Нет», «Уваж. причина». Отметка — только через
-- mark_attendance: сервер проверяет, что группа своя, ученик в группе и дата
-- не дальше 30 дней назад. Когда ученик отмечен «Нет», приложение просит
-- send-push сообщить родителям (один раз на отметку).
--
-- Выполнять после 0028.

-- Одна отметка на ученика в группе за день (у отметок без занятия
-- обычный unique не срабатывает: NULL в lesson_id всегда «разный»).
-- Старые повторы (если были) — оставляем последнюю отметку.
delete from public.attendance a
using public.attendance b
where a.lesson_id is null and b.lesson_id is null
  and a.group_id = b.group_id and a.student_id = b.student_id and a.lesson_date = b.lesson_date
  and (a.created_at, a.id) < (b.created_at, b.id);

create unique index if not exists attendance_day_unique
  on public.attendance (group_id, student_id, lesson_date)
  where lesson_id is null;

-- Прямой записи нет ни у кого: только mark_attendance.
drop policy if exists "attendance_write_admin" on public.attendance;
drop policy if exists "attendance_write_staff" on public.attendance;

-- Родитель может отключить пуш об отсутствии ребёнка в настройках.
alter table public.profiles add column if not exists notify_attendance boolean not null default true;

create or replace function public.mark_attendance(
  p_group_id uuid,
  p_student_id uuid,
  p_date date,
  p_status public.attendance_status
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.can_manage_group(p_group_id) then
    raise exception 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and student_id = p_student_id) then
    raise exception 'student not in group';
  end if;
  -- В Алматы UTC+5: «сегодня» на телефоне может быть «завтра» на сервере.
  if p_date < current_date - 30 or p_date > current_date + 1 then
    raise exception 'date out of range';
  end if;
  insert into public.attendance (group_id, student_id, lesson_date, status, marked_by)
  values (p_group_id, p_student_id, p_date, p_status, auth.uid())
  on conflict (group_id, student_id, lesson_date) where lesson_id is null
  do update set status = excluded.status, marked_by = excluded.marked_by, created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.mark_attendance(uuid, uuid, date, public.attendance_status) from public, anon;
grant execute on function public.mark_attendance(uuid, uuid, date, public.attendance_status) to authenticated;
