// Объявления с сайта kasteyevshop.kz для вкладки «Все объявления на сайте».
//
// У сайта нет API: функция читает главную и страницы категорий, вынимает
// карточки товаров (название, автор, цена, размер, фото, ссылка), копирует
// фото в хранилище shop-images и обновляет таблицу shop_listings.
//
// Вызывает приложение, когда данные старше недели. Чаще раза в неделю функция
// сайт не читает (администратор может обновить принудительно: { force: true }).
// Если сайт поменял вёрстку и карточек не нашлось, старый список остаётся.
//
// Развёртывание: Supabase → Edge Functions → Deploy a new function →
// имя sync-shop → вставить этот файл. Verify JWT оставить включённым.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

const SITES = ['https://kasteyevshop.kz', 'http://kasteyevshop.kz'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAGES = 30;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface Listing {
  id: string;
  title: string;
  author: string | null;
  price: string | null;
  size: string | null;
  url: string;
  source_image: string | null;
  sort_order: number;
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decode(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function field(block: string, cls: string): string | null {
  const m = block.match(new RegExp(`<div class="${cls}[^"]*"[^>]*>([\\s\\S]*?)</div>`));
  const value = m ? decode(m[1]) : '';
  return value || null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KasteyevSchool-app/1.0 (+weekly listing sync)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return await res.text();
}

// Сначала https (когда его включат), иначе http.
async function openSite(): Promise<{ base: string; home: string }> {
  let lastError: unknown = null;
  for (const base of SITES) {
    try {
      return { base, home: await fetchText(`${base}/ru/`) };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('site unavailable');
}

function parseListings(html: string, base: string, into: Map<string, Listing>) {
  const blocks = html.split('<div class="prod_item">').slice(1);
  for (const block of blocks) {
    const link = block.match(/href="(\/ru\/(\d+)-[^"\/]+\/)"/);
    if (!link) continue;
    const id = link[2];
    if (into.has(id)) continue;
    const title = field(block, 'prod_title');
    if (!title) continue;
    const img = block.match(/<div class="prod_img">[\s\S]*?<img[^>]*src="([^"]+)"/);
    into.set(id, {
      id,
      title: title.slice(0, 200),
      author: field(block, 'prod_author')?.slice(0, 200) ?? null,
      price: field(block, 'prod_price')?.slice(0, 50) ?? null,
      size: field(block, 'prod_item_size')?.slice(0, 50) ?? null,
      url: `${base}${link[1]}`,
      source_image: img ? new URL(img[1], base).toString() : null,
      sort_order: into.size,
    });
  }
}

// Копия фото в хранилище: путь зависит от адреса фото, поэтому при замене
// фото на сайте появится новый файл, а старый удалится.
async function copyImage(admin: SupabaseClient, listing: Listing): Promise<string | null> {
  if (!listing.source_image) return null;
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(listing.source_image)))
  )
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const path = `${listing.id}-${hash}.jpg`;
  const res = await fetch(listing.source_image, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  const type = res.headers.get('content-type') ?? 'image/jpeg';
  if (!type.startsWith('image/')) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;
  const { error } = await admin.storage.from('shop-images').upload(path, bytes, { contentType: type, upsert: true });
  if (error) return null;
  return admin.storage.from('shop-images').getPublicUrl(path).data.publicUrl;
}

async function sync(admin: SupabaseClient) {
  const { base, home } = await openSite();
  const listings = new Map<string, Listing>();
  parseListings(home, base, listings);
  const categories = [...new Set([...home.matchAll(/href="(\/ru\/category\/[^"]+\/)"/g)].map((m) => m[1]))];
  for (const path of categories.slice(0, MAX_PAGES)) {
    try {
      parseListings(await fetchText(`${base}${path}`), base, listings);
    } catch {
      // Одна категория не открылась — остальные всё равно берём.
    }
  }
  if (listings.size === 0) {
    throw new Error('no listings found: site layout may have changed');
  }

  const { data: existing } = await admin.from('shop_listings').select('id, source_image, image_url');
  const known = new Map((existing ?? []).map((r) => [r.id as string, r]));

  const rows = [];
  for (const listing of listings.values()) {
    const prev = known.get(listing.id);
    let image_url: string | null = prev?.image_url ?? null;
    if (!prev || prev.source_image !== listing.source_image || !image_url) {
      image_url = (await copyImage(admin, listing).catch(() => null)) ?? image_url;
    }
    rows.push({ ...listing, image_url, synced_at: new Date().toISOString() });
  }
  const { error: upsertError } = await admin.from('shop_listings').upsert(rows);
  if (upsertError) throw upsertError;

  // Снятые с сайта объявления удаляем вместе с копиями фото.
  const gone = [...known.keys()].filter((id) => !listings.has(id));
  if (gone.length > 0) {
    await admin.from('shop_listings').delete().in('id', gone);
  }
  const { data: files } = await admin.storage.from('shop-images').list('', { limit: 1000 });
  const used = new Set(rows.map((r) => r.image_url?.split('/').pop()).filter(Boolean));
  const unused = (files ?? []).map((f) => f.name).filter((name) => !used.has(name));
  if (unused.length > 0) await admin.storage.from('shop-images').remove(unused);

  return { count: rows.length, removed: gone.length, base };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // Вызывать может только вошедший пользователь приложения.
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json(401, { error: 'unauthorized' });

  let force = false;
  try {
    force = Boolean((await req.json())?.force);
  } catch {
    // Пустое тело — обычный вызов.
  }
  const admin = createClient(url, serviceKey);
  if (force) {
    const { data: me } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
    if (me?.role !== 'admin') force = false;
  }

  // Занимаем обновление: только если прошло больше недели (или force).
  // Одновременные вызовы не запустят чтение сайта дважды.
  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK_MS).toISOString();
  let claim = admin.from('shop_sync').update({ synced_at: now.toISOString(), error: null }).eq('id', 1);
  if (!force) claim = claim.or(`synced_at.is.null,synced_at.lt.${weekAgo}`);
  const { data: claimed, error: claimError } = await claim.select('id');
  if (claimError) return json(500, { error: claimError.message });
  if (!claimed || claimed.length === 0) return json(200, { skipped: true });

  try {
    const result = await sync(admin);
    return json(200, { ok: true, ...result });
  } catch (e) {
    // Не получилось — попробуем снова через сутки, а не через неделю.
    const retryAt = new Date(now.getTime() - WEEK_MS + 24 * 60 * 60 * 1000).toISOString();
    const message = e instanceof Error ? e.message : String(e);
    await admin.from('shop_sync').update({ synced_at: retryAt, error: message.slice(0, 500) }).eq('id', 1);
    return json(502, { error: message });
  }
});
