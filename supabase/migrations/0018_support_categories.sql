-- Причины обращения в «Помощь», как их назвала школа:
-- «Проблема с приложением» (bug), «Проблема с расписанием» (schedule),
-- «Инфраструктура и операционные вопросы» (operations), «Другое» (other).
-- Старое значение question остаётся для уже созданных обращений.

alter type public.support_category add value if not exists 'schedule';
alter type public.support_category add value if not exists 'operations';
