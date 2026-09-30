-- Настройки push-уведомлений пользователя: каждая категория включается и
-- выключается отдельно. По умолчанию всё включено — поведение для уже
-- существующих пользователей не меняется.
--
-- Фильтрация происходит на сервере, в Edge Function send-push: отправитель
-- указывает категорию уведомления, функция отбрасывает получателей, у
-- которых эта категория выключена.

alter table public.profiles
  add column notify_announcements boolean not null default true,
  add column notify_comments boolean not null default true,
  add column notify_moderation boolean not null default true;

comment on column public.profiles.notify_announcements is 'Получать push о новых объявлениях';
comment on column public.profiles.notify_comments is 'Получать push о комментариях к своим работам';
comment on column public.profiles.notify_moderation is 'Получать push о решениях модерации по своим работам и объявлениям о продаже';
