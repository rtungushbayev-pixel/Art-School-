-- Напоминания о занятиях (ученику и родителю, за 2 часа). Сами напоминания
-- планирует телефон; здесь — только настройка «включено/выключено».
-- Об отмене или переносе занятия send-push сообщает ученикам группы и их
-- родителям (событие lesson_change).
--
-- Выполнять после 0032.

alter table public.profiles add column if not exists notify_reminders boolean not null default true;
