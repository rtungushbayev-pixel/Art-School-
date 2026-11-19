-- Совет Supabase (function_search_path_mutable): у служебных функций
-- фиксируем search_path, чтобы их поведение не зависело от настроек сеанса.
-- Функции и так обращаются к объектам с указанием схемы, поведение не меняется.
--
-- Выполнять после 0037.

alter function public.normalize_roster_code(text) set search_path = public;
alter function public.is_own_storage_url(text, text, uuid) set search_path = public;
alter function public.enforce_profile_avatar() set search_path = public;
alter function public.storage_public_prefix() set search_path = public;
alter function public.force_created_at() set search_path = public;
