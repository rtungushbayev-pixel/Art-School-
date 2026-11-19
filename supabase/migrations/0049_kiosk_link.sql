-- Подключение планшета по ссылке из письма (вместо «Режима планшета» на экране входа).
--
-- Администратор в «QR-коды филиалов» нажимает «Отправить ссылку для планшета»
-- и отправляет письмо руководителю филиала. Ссылка ведёт на функцию
-- kiosk-link, та открывает приложение на планшете с кодом подключения.
-- Код длиннее обычного (12 символов) и действует 7 дней, потому что письмо
-- открывают не сразу. Подключение — тем же pair_kiosk из 0041: код
-- одноразовый, после подключения стирается. Отозвать ссылку до подключения —
-- «Отключить» у строки «ждёт подключения».
--
-- Выполнять после 0041.

create or replace function public.create_kiosk_link(p_branch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'branch_not_found';
  end if;
  -- 12 символов без похожих (0/O, 1/I).
  v_code := upper(translate(left(replace(gen_random_uuid()::text, '-', ''), 12), '01', '89'));
  insert into public.branch_kiosks (branch_id, pairing_code, pairing_expires_at)
  values (p_branch_id, v_code, now() + interval '7 days');
  return v_code;
end;
$$;

revoke execute on function public.create_kiosk_link(uuid) from public, anon;
grant execute on function public.create_kiosk_link(uuid) to authenticated;
