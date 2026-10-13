import { supabase } from './supabase';
import type { Branch } from '../types/database';

// Содержимое QR у входа в филиал: префикс + секретный код филиала.
const PREFIX = 'kasteyevschool-checkin:';

export function checkinQrValue(token: string): string {
  return `${PREFIX}${token}`;
}

// Код из отсканированного QR или null, если это чужой QR.
export function parseCheckinQr(data: string): string | null {
  const text = data.trim();
  if (!text.startsWith(PREFIX)) return null;
  const token = text.slice(PREFIX.length).trim();
  return /^[0-9a-f]{16,128}$/i.test(token) ? token : null;
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

export type BranchCode = Branch & { token: string | null };

// Только администратор: филиалы и их коды для печати QR.
export async function fetchBranchCodes(): Promise<BranchCode[]> {
  const [{ data: branches, error }, { data: codes, error: codesError }] = await Promise.all([
    supabase.from('branches').select('*').order('sort_order'),
    supabase.from('branch_checkin_codes').select('branch_id, token'),
  ]);
  if (error) throw error;
  if (codesError) throw codesError;
  const tokens = new Map((codes ?? []).map((c) => [c.branch_id as string, c.token as string]));
  return ((branches as Branch[]) ?? []).map((b) => ({ ...b, token: tokens.get(b.id) ?? null }));
}

export async function regenerateCheckinCode(branchId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_checkin_code', { p_branch_id: branchId });
  if (error) throw error;
  return String(data);
}
