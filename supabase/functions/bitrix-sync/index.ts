// Проходы через терминал распознавания лиц из Битрикс24 (филиал Ауэзова).
//
// Портал события не отправляет, поэтому функция сама забирает новые проходы
// методом cntl.school.pass.list: sinceId — ID последнего уже забранного
// прохода, limit — до 200. В ответе по каждому проходу: время, dealId ученика
// и номер в реестре, плюс lastId для следующего запроса.
//
// Вызывает приложение, когда сотрудник открывает посещаемость (не чаще раза
// в 30 секунд на всех). Повторные проходы за день отбрасываются при показе.
//
// Развёртывание: Supabase → Edge Functions → Deploy a new function →
// имя bitrix-sync → вставить этот файл. Verify JWT оставить включённым.
// Секрет (Edge Functions → Secrets): BITRIX_WEBHOOK_URL — адрес входящего
// вебхука вида https://портал/rest/ID/КЛЮЧ/ (с методом или без него).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

const METHOD = 'cntl.school.pass.list';
const LIMIT = 200;
const MAX_PAGES = 50;
const THROTTLE_MS = 30 * 1000;

interface Pass {
  id: number;
  deal_id: number;
  passed_at: string;
  registry_no: string | null;
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function methodUrl(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, '');
  if (trimmed.endsWith(METHOD) || trimmed.endsWith(`${METHOD}.json`)) return trimmed;
  return `${trimmed}/${METHOD}.json`;
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return undefined;
}

// Время без часового пояса считаем алматинским (UTC+5).
function toTimestamp(value: unknown): string | null {
  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  let text = value.trim();
  const ru = text.match(/^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
  if (ru) text = `${ru[3]}-${ru[2]}-${ru[1]}T${ru[4]}`;
  text = text.replace(' ', 'T');
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(text)) text += '+05:00';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Разбор ответа без жёсткой привязки к названиям полей: Битрикс отдаёт
// { result: { items: [...], lastId } } или { result: [...] }.
function parseResponse(body: Record<string, unknown>): { passes: Pass[]; lastId: number | null } {
  const result = (body.result ?? body) as Record<string, unknown> | unknown[];
  const list = (Array.isArray(result)
    ? result
    : (pick(result, ['items', 'passes', 'list', 'ITEMS', 'PASSES']) as unknown[] | undefined) ?? []) as Record<string, unknown>[];
  const passes: Pass[] = [];
  for (const row of list) {
    const id = Number(pick(row, ['id', 'ID', 'passId', 'PASS_ID']));
    const dealId = Number(pick(row, ['dealId', 'DEAL_ID', 'deal_id', 'dealID']));
    const passedAt = toTimestamp(pick(row, ['eventAt', 'time', 'TIME', 'date', 'DATE', 'passedAt', 'datetime', 'DATE_CREATE', 'createdAt']));
    const registry = pick(row, ['registryNo', 'number', 'NUMBER', 'registryNumber', 'regNumber', 'REGISTRY_NUMBER', 'registry']);
    // Нужен только вход в здание; выход («out») не отмечаем.
    const direction = String(pick(row, ['direction', 'DIRECTION']) ?? 'in').toLowerCase();
    if (!Number.isFinite(id) || !Number.isFinite(dealId) || !passedAt || direction === 'out') continue;
    passes.push({ id, deal_id: dealId, passed_at: passedAt, registry_no: registry != null ? String(registry).slice(0, 100) : null });
  }
  const rawLast = Array.isArray(result) ? body.lastId ?? body.LAST_ID : pick(result, ['lastId', 'LAST_ID', 'last_id']) ?? body.lastId;
  const lastId = rawLast != null && Number.isFinite(Number(rawLast)) ? Number(rawLast) : null;
  return { passes, lastId };
}

async function sync(admin: SupabaseClient, url: string, sinceId: number) {
  let cursor = sinceId;
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sinceId: cursor, limit: LIMIT }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Bitrix HTTP ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    if (body.error) throw new Error(`Bitrix: ${String(body.error_description ?? body.error)}`);
    const { passes, lastId } = parseResponse(body);
    if (passes.length > 0) {
      const { error } = await admin.from('bitrix_passes').upsert(passes, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
      total += passes.length;
    }
    const next = Math.max(lastId ?? cursor, ...passes.map((p) => p.id), cursor);
    if (next === cursor) break;
    cursor = next;
    await admin.from('bitrix_sync').update({ last_id: cursor }).eq('id', 1);
    if (passes.length < LIMIT && (lastId ?? 0) <= cursor) break;
  }
  return { added: total, lastId: cursor };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const webhook = Deno.env.get('BITRIX_WEBHOOK_URL');
  if (!webhook) return json(200, { skipped: 'not configured' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Вызывать могут только сотрудники школы.
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: 'unauthorized' });
  const { data: auth } = await admin.auth.getUser(jwt);
  if (!auth?.user) return json(401, { error: 'unauthorized' });
  const { data: me } = await admin.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (me?.role !== 'staff' && me?.role !== 'admin') return json(403, { error: 'forbidden' });

  // Не чаще раза в 30 секунд; одновременные вызовы не идут в Битрикс дважды.
  const now = new Date();
  const { data: claimed, error: claimError } = await admin
    .from('bitrix_sync')
    .update({ synced_at: now.toISOString() })
    .eq('id', 1)
    .or(`synced_at.is.null,synced_at.lt.${new Date(now.getTime() - THROTTLE_MS).toISOString()}`)
    .select('last_id');
  if (claimError) return json(500, { error: claimError.message });
  if (!claimed || claimed.length === 0) return json(200, { skipped: 'recent' });

  try {
    const result = await sync(admin, methodUrl(webhook), Number(claimed[0].last_id));
    await admin.from('bitrix_sync').update({ error: null }).eq('id', 1);
    return json(200, { ok: true, ...result });
  } catch (e) {
    // В тексте сетевой ошибки бывает полный адрес вебхука с ключом — вырезаем.
    const message = (e instanceof Error ? e.message : String(e)).split(webhook.trim()).join('[webhook]');
    console.error(message);
    await admin.from('bitrix_sync').update({ error: message.slice(0, 500) }).eq('id', 1);
    return json(502, { error: 'bitrix unavailable' });
  }
});
