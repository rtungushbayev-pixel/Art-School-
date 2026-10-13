import { supabase } from './supabase';
import { sendPushNotification } from './notifications';
import { getLang, pick, type Lang, type Translations } from '../i18n';
import type { BillingEntry, BillingKind, PaymentMethod, StudentBalance } from '../types/database';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
  kaspi: 'Kaspi',
};

const PAYMENT_METHOD_LABELS_I18N: Translations<Record<PaymentMethod, string>> = {
  ru: PAYMENT_METHOD_LABELS,
  kk: { cash: 'Қолма-қол', card: 'Карта', transfer: 'Аударым', kaspi: 'Kaspi' },
  en: { cash: 'Cash', card: 'Card', transfer: 'Transfer', kaspi: 'Kaspi' },
};

export function paymentMethodLabel(method: PaymentMethod, lang: Lang = getLang()): string {
  return pick(PAYMENT_METHOD_LABELS_I18N, lang)[method];
}

const CURRENCY_SIGNS: Record<string, string> = { KZT: '₸' };

// 12500 → «12 500 ₸». Без Intl: на Hermes набор локалей зависит от сборки.
export function formatMoney(amount: number, currency = 'KZT'): string {
  const value = Math.abs(Number(amount));
  const [whole, fraction] = value.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const number = fraction === '00' ? grouped : `${grouped},${fraction}`;
  const sign = Number(amount) < 0 ? '−' : '';
  return `${sign}${number} ${CURRENCY_SIGNS[currency] ?? currency}`;
}

export async function fetchBillingEntries(studentId: string): Promise<BillingEntry[]> {
  const { data, error } = await supabase
    .from('billing_entries')
    .select('*')
    .eq('student_id', studentId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as BillingEntry[]) ?? []).map((e) => ({ ...e, amount: Number(e.amount) }));
}

export async function fetchBalances(studentId?: string): Promise<StudentBalance[]> {
  let request = supabase.from('student_balances').select('*');
  if (studentId) request = request.eq('student_id', studentId);
  const { data, error } = await request;
  if (error) throw error;
  return ((data as StudentBalance[]) ?? []).map((b) => ({
    ...b,
    charged: Number(b.charged),
    paid: Number(b.paid),
    balance: Number(b.balance),
  }));
}

export interface NewBillingEntry {
  kind: BillingKind;
  amount: number;
  description: string;
  entryDate: string;
  method: PaymentMethod | null;
}

export async function addBillingEntries(studentIds: string[], entry: NewBillingEntry) {
  const rows = studentIds.map((studentId) => ({
    student_id: studentId,
    kind: entry.kind,
    amount: entry.amount,
    description: entry.description,
    entry_date: entry.entryDate,
    method: entry.kind === 'payment' ? entry.method : null,
  }));
  const { error } = await supabase.from('billing_entries').insert(rows);
  if (error) throw error;
}

export async function deleteBillingEntry(id: string) {
  const { error } = await supabase.from('billing_entries').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Оплата через Kaspi ----------

// Ссылка на оплату в кассу Kaspi Pay: филиала ученика или общая школьная.
export async function fetchPaymentLink(studentId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('student_payment_link', { p_student_id: studentId });
  if (error) return null;
  return typeof data === 'string' && data.startsWith('https://') ? data : null;
}

export interface PaymentClaim {
  id: string;
  student_id: string;
  amount: number;
  note: string | null;
  claimed_by: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  student: { id: string; full_name: string } | null;
  claimer: { id: string; full_name: string } | null;
}

const CLAIM_SELECT = '*, student:student_id ( id, full_name ), claimer:claimed_by ( id, full_name )';

// «Я оплатил»: администратор проверит поступление в Kaspi и подтвердит.
export async function createPaymentClaim(studentId: string, amount: number, note: string | null): Promise<void> {
  const { data, error } = await supabase
    .from('payment_claims')
    .insert({ student_id: studentId, amount, note })
    .select('id')
    .single();
  if (error) throw error;
  if (data?.id) sendPushNotification({ event: 'payment_claim', id: data.id as string });
}

export async function fetchPaymentClaims(options: { studentId?: string; pendingOnly?: boolean }): Promise<PaymentClaim[]> {
  let request = supabase.from('payment_claims').select(CLAIM_SELECT).order('created_at', { ascending: false }).limit(200);
  if (options.studentId) request = request.eq('student_id', options.studentId);
  if (options.pendingOnly) request = request.eq('status', 'pending');
  const { data, error } = await request;
  if (error) throw error;
  return ((data as PaymentClaim[]) ?? []).map((c) => ({ ...c, amount: Number(c.amount) }));
}

export async function decidePaymentClaim(claimId: string, confirm: boolean): Promise<void> {
  const { error } = await supabase.rpc('decide_payment_claim', { p_claim_id: claimId, p_confirm: confirm });
  if (error) throw error;
}

export async function remindDebtors(): Promise<void> {
  // id — дата: одно напоминание должникам в день.
  const today = new Date();
  const id = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const { error } = await supabase.functions.invoke('send-push', { body: { event: 'debt_reminder', id } });
  if (error) throw error;
}

export interface PaymentLinks {
  general: string | null;
  branches: { id: string; name: string; url: string | null }[];
}

export async function fetchPaymentLinks(): Promise<PaymentLinks> {
  const [{ data: settings }, { data: branches, error }] = await Promise.all([
    supabase.from('payment_settings').select('kaspi_pay_url').eq('id', 1).maybeSingle(),
    supabase.from('branches').select('id, name, kaspi_pay_url').order('sort_order'),
  ]);
  if (error) throw error;
  return {
    general: (settings as { kaspi_pay_url: string | null } | null)?.kaspi_pay_url ?? null,
    branches: ((branches as { id: string; name: string; kaspi_pay_url: string | null }[]) ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      url: b.kaspi_pay_url,
    })),
  };
}

export async function savePaymentLinks(links: PaymentLinks): Promise<void> {
  const { error } = await supabase
    .from('payment_settings')
    .update({ kaspi_pay_url: links.general, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
  for (const b of links.branches) {
    const { error: branchError } = await supabase.from('branches').update({ kaspi_pay_url: b.url }).eq('id', b.id);
    if (branchError) throw branchError;
  }
}
