-- Уровень конкурса или выставки: городской, республиканский или зарубежный.
-- Нужен для поиска и фильтра в разделе «Конкурсы». Необязательное поле:
-- у старых событий остаётся пустым.
--
-- Выполнять после 0052.

alter table public.school_events
  add column if not exists level text
  check (level is null or level in ('city', 'republic', 'international'));
