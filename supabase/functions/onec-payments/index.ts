// Выгрузка оплат для 1С:Бухгалтерии.
//
// 1С раз в несколько минут спрашивает новые записи после последнего
// полученного номера и создаёт по ним поступление на ребёнка (по коду в 1С).
//
//   GET /functions/v1/onec-payments?since=0&limit=200
//   Заголовок: X-Api-Key: <секрет ONEC_API_KEY>
//   Необязательно: &kind=all — вместе с начислениями (по умолчанию только оплаты)
//
// Ответ: { items: [...], lastId } — lastId передаётся в следующем запросе как since.
// Записи отдаются по возрастанию номера (export_id), не больше 500 за раз.
//
// Развёртывание: Supabase → Edge Functions → Deploy a new function →
// имя onec-payments → вставить этот файл. Verify JWT ВЫКЛЮЧИТЬ: у 1С нет
// входа в приложение, доступ проверяется по ключу. Секрет (Edge Functions →
// Secrets): ONEC_API_KEY — длинная случайная строка, её же вписывают в 1С.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const MAX_LIMIT = 500;

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// Сравнение без утечки по времени.
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const expected = Deno.env.get('ONEC_API_KEY') ?? '';
  const given = req.headers.get('X-Api-Key') ?? '';
  if (expected.length < 24 || !safeEqual(given, expected)) return json(401, { error: 'unauthorized' });

  const url = new URL(req.url);
  const since = Math.max(0, Number(url.searchParams.get('since') ?? 0) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit') ?? 200) || 200));
  const all = url.searchParams.get('kind') === 'all';

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let query = admin
    .from('billing_entries')
    .select('id, export_id, kind, student_id, amount, currency, description, method, entry_date, created_at, student:student_id ( full_name )')
    .gt('export_id', since)
    .order('export_id')
    .limit(limit);
  if (!all) query = query.eq('kind', 'payment');
  const { data: entries, error } = await query;
  if (error) {
    console.error(error.message);
    return json(500, { error: 'internal error' });
  }

  const studentIds = [...new Set((entries ?? []).map((e) => e.student_id as string))];
  const codes = new Map<string, { onec_code: string | null; group: string | null }>();
  if (studentIds.length > 0) {
    const { data: roster } = await admin
      .from('school_roster')
      .select('student_id, onec_code, group:group_id ( name )')
      .in('student_id', studentIds);
    for (const r of roster ?? []) {
      const group = r.group as unknown as { name: string } | null;
      codes.set(r.student_id as string, { onec_code: (r.onec_code as string | null) ?? null, group: group?.name ?? null });
    }
  }

  const items = (entries ?? []).map((e) => {
    const student = e.student as unknown as { full_name: string } | null;
    const extra = codes.get(e.student_id as string);
    return {
      id: Number(e.export_id),
      entryId: e.id,
      kind: e.kind, // payment — оплата, charge — начисление
      studentId: e.student_id,
      studentName: student?.full_name ?? '',
      onecCode: extra?.onec_code ?? null,
      group: extra?.group ?? null,
      amount: Number(e.amount),
      currency: e.currency,
      date: e.entry_date,
      method: e.method, // cash, card, transfer, kaspi
      description: e.description,
      createdAt: e.created_at,
    };
  });

  const lastId = items.length > 0 ? items[items.length - 1].id : since;
  return json(200, { items, lastId });
});
