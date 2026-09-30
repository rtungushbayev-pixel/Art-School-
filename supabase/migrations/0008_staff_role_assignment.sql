-- Закрывает самостоятельную регистрацию сотрудником.
--
-- handle_new_user из 0001 брал роль из raw_user_meta_data — эти данные
-- присылает клиент при signUp, поэтому любой мог зарегистрироваться
-- сотрудником и получить права staff: оценки, посещаемость, модерацию,
-- объявления и рассылку пушей всей школе.
--
-- Теперь каждый новый пользователь — ученик. Сотрудником человека делает
-- другой сотрудник через RPC set_user_role (в приложении — кнопка на экране
-- профиля). Первого сотрудника назначают один раз в SQL Editor:
--
--   update public.profiles set role = 'staff' where id = '<uuid пользователя>';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student'
  );
  return new;
end;
$$;

-- Смена роли другого пользователя. Политика profiles_update_own не даёт
-- сотруднику править чужой профиль, поэтому нужна отдельная функция.
create function public.set_user_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'insufficient_privilege: only staff can change roles';
  end if;
  -- Защита от случайной потери доступа: свою роль сотрудник не меняет.
  if p_user_id = auth.uid() then
    raise exception 'cannot change own role';
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

revoke execute on function public.set_user_role(uuid, user_role) from public, anon;
grant execute on function public.set_user_role(uuid, user_role) to authenticated;
