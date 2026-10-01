import { supabase } from './supabase';
import { getLang, pick, type Lang, type Translations } from '../i18n';
import type { BillingEntry, BillingKind, PaymentMethod, StudentBalance } from '../types/database';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
};

const PAYMENT_METHOD_LABELS_I18N: Translations<Record<PaymentMethod, string>> = {
  ru: PAYMENT_METHOD_LABELS,
  kk: { cash: 'Қолма-қол', card: 'Карта', transfer: 'Аударым' },
  en: { cash: 'Cash', card: 'Card', transfer: 'Transfer' },
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
