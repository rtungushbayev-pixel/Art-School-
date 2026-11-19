-- 1. QR-отметка временно выключена: код можно сфотографировать и отметиться
--    из дома, поэтому посещаемость отмечают преподаватели вручную.
--    Функция и коды филиалов остаются; чтобы включить обратно:
--      grant execute on function public.qr_check_in(text) to authenticated;
--    и FEATURES.qrCheckIn = true в приложении.
--
-- 2. Заготовка под автоматическое подтверждение оплат через API Kaspi
--    (после договора с Kaspi). План: функция kaspi-webhook принимает
--    уведомление Kaspi об оплате, записывает оплату в billing_entries
--    (method = kaspi, external_txn_id = номер операции Kaspi — повторное
--    уведомление не задвоит оплату) и закрывает подходящую заявку
--    «Я оплатил» (source = kaspi_api). Ручное подтверждение остаётся
--    запасным вариантом.
--
-- Выполнять после 0039.

revoke execute on function public.qr_check_in(text) from authenticated;

alter table public.billing_entries
  add column if not exists external_txn_id text;
create unique index if not exists billing_entries_external_txn_uidx
  on public.billing_entries (external_txn_id) where external_txn_id is not null;

alter table public.payment_claims
  add column if not exists source text not null default 'manual' check (source in ('manual', 'kaspi_api')),
  add column if not exists external_txn_id text;
create unique index if not exists payment_claims_external_txn_uidx
  on public.payment_claims (external_txn_id) where external_txn_id is not null;

-- Из приложения заявка всегда ручная: источник и номер операции Kaspi
-- ставит только сервер (будущая функция kaspi-webhook).
create or replace function public.prepare_payment_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.claimed_by := auth.uid();
  new.status := 'pending';
  new.billing_entry_id := null;
  new.decided_by := null;
  new.decided_at := null;
  new.created_at := now();
  new.note := nullif(trim(coalesce(new.note, '')), '');
  if auth.uid() is not null then
    new.source := 'manual';
    new.external_txn_id := null;
  end if;
  if (
    select count(*) from public.payment_claims
    where claimed_by = new.claimed_by and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;
