import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

// Содержимое QR на планшете у входа: префикс + «<id филиала>.<код>».
// Код меняется каждые 30 секунд (см. миграцию 0041).
const PREFIX = 'kasteyevschool-checkin:';

export function checkinQrValue(branchId: string, code: string): string {
  return `${PREFIX}${branchId}.${code}`;
}

// «<id филиала>.<код>» из отсканированного QR или null, если это чужой QR.
export function parseCheckinQr(data: string): string | null {
  const text = data.trim();
  if (!text.startsWith(PREFIX)) return null;
  const token = text.slice(PREFIX.length).trim();
  return /^[0-9a-f-]{36}\.[0-9a-f]{32}$/i.test(token) ? token : null;
}

export interface CheckInResult {
  student_name: string;
  group_name: string;
  status: 'present' | 'late';
}

export async function qrCheckIn(token: string): Promise<CheckInResult[]> {
  const { data, error } = await supabase.rpc('qr_check_in', { p_token: token });
  if (error) throw error;
  return (data as CheckInResult[]) ?? [];
}

// ---------- Планшет у входа (режим киоска) ----------

const KIOSK_KEY = 'kiosk-device-token';

export async function getKioskToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KIOSK_KEY);
  } catch {
    return null;
  }
}

export async function clearKioskToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KIOSK_KEY).catch(() => {});
}

// Подключение планшета по коду, который показал администратор.
export async function pairKiosk(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('pair_kiosk', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  const row = (data as { device_token: string; branch_name: string }[] | null)?.[0];
  if (!row) throw new Error('invalid_pairing_code');
  await SecureStore.setItemAsync(KIOSK_KEY, row.device_token);
  return row.branch_name;
}

export interface KioskQr {
  branch_id: string;
  branch_name: string;
  code: string;
  seconds_left: number;
}

export async function fetchKioskQr(deviceToken: string): Promise<KioskQr> {
  const { data, error } = await supabase.rpc('kiosk_current_qr', { p_device_token: deviceToken });
  if (error) throw error;
  const row = (data as KioskQr[] | null)?.[0];
  if (!row) throw new Error('kiosk_not_paired');
  return row;
}

// ---------- Администратор: планшеты филиалов ----------

export interface BranchKiosk {
  id: string;
  branch_id: string;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export async function fetchKiosks(): Promise<BranchKiosk[]> {
  const { data, error } = await supabase
    .from('branch_kiosks')
    .select('id, branch_id, pairing_code, pairing_expires_at, paired_at, last_seen_at, created_at')
    .order('created_at');
  if (error) throw error;
  return (data as BranchKiosk[]) ?? [];
}

// Ссылка для письма руководителю филиала: открывает приложение на планшете
// сразу на экране подключения (функция kiosk-link, миграция 0049).
export async function createKioskLink(branchId: string): Promise<{ code: string; url: string }> {
  const { data, error } = await supabase.rpc('create_kiosk_link', { p_branch_id: branchId });
  if (error) throw error;
  const code = String(data);
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return { code, url: `${base}/functions/v1/kiosk-link?k=${code}` };
}

// Код из ссылки kasteyevschool://kiosk?k=КОД, иначе null.
export function kioskCodeFromUrl(url: string | null): string | null {
  if (!url || !url.startsWith('kasteyevschool://kiosk')) return null;
  const match = /[?&]k=([A-Za-z0-9]+)/.exec(url);
  return match ? match[1].toUpperCase() : null;
}

export async function deleteKiosk(id: string): Promise<void> {
  const { error } = await supabase.from('branch_kiosks').delete().eq('id', id);
  if (error) throw error;
}

// Смена секрета филиала: все коды и снимки QR сразу перестают работать.
export async function regenerateCheckinCode(branchId: string): Promise<void> {
  const { error } = await supabase.rpc('regenerate_checkin_code', { p_branch_id: branchId });
  if (error) throw error;
}
