import { supabase } from './supabase';

// Сайт, где продаются работы школы. Объявления с него раз в неделю копирует
// функция sync-shop (у сайта нет API), приложение читает копию из базы.
export const SHOP_URL = 'https://kasteyevshop.kz/ru/';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface ShopListing {
  id: string;
  title: string;
  author: string | null;
  price: string | null;
  size: string | null;
  url: string;
  image_url: string | null;
  sort_order: number;
}

export async function fetchShopListings(): Promise<ShopListing[]> {
  const { data, error } = await supabase.from('shop_listings').select('*').order('sort_order');
  if (error) throw error;
  return (data as ShopListing[]) ?? [];
}

// Если копия старше недели — просим сервер обновить её. Сервер сам не даст
// читать сайт чаще раза в неделю. Возвращает true, если список обновился.
export async function refreshShopIfStale(): Promise<boolean> {
  const { data } = await supabase.from('shop_sync').select('synced_at').eq('id', 1).maybeSingle();
  const syncedAt = data?.synced_at ? new Date(data.synced_at).getTime() : 0;
  if (Date.now() - syncedAt < WEEK_MS) return false;
  const { data: result, error } = await supabase.functions.invoke('sync-shop', { body: {} });
  return !error && Boolean((result as { ok?: boolean } | null)?.ok);
}
