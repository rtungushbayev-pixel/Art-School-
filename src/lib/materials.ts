import { supabase } from './supabase';
import { getLang, pick, type Translations } from '../i18n';
import type { MaterialRequest, MaterialRequestStatus, MaterialUnit, Profile } from '../types/database';

export const MATERIAL_UNITS: MaterialUnit[] = ['pcs', 'pack', 'set', 'sheet', 'l', 'kg', 'm'];

const UNIT_LABELS: Translations<Record<MaterialUnit, string>> = {
  ru: { pcs: 'шт.', pack: 'уп.', set: 'набор', sheet: 'лист', l: 'л', kg: 'кг', m: 'м' },
  kk: { pcs: 'дана', pack: 'қорап', set: 'жиынтық', sheet: 'парақ', l: 'л', kg: 'кг', m: 'м' },
  en: { pcs: 'pcs', pack: 'pack', set: 'set', sheet: 'sheet', l: 'l', kg: 'kg', m: 'm' },
};

export function materialUnitLabel(unit: MaterialUnit): string {
  return pick(UNIT_LABELS)[unit];
}

const STATUS_LABELS: Translations<Record<MaterialRequestStatus, string>> = {
  ru: { pending: 'Ожидает', issued: 'Выдано', rejected: 'Отклонено' },
  kk: { pending: 'Күтуде', issued: 'Берілді', rejected: 'Қабылданбады' },
  en: { pending: 'Pending', issued: 'Issued', rejected: 'Rejected' },
};

export function materialStatusLabel(status: MaterialRequestStatus): string {
  return pick(STATUS_LABELS)[status];
}

// «5», «2,5» — без лишних нулей.
export function formatQuantity(value: number): string {
  const n = Math.round(Number(value) * 100) / 100;
  return getLang() === 'en' ? String(n) : String(n).replace('.', ',');
}

const MONTHS: Translations<string[]> = {
  ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  kk: ['қаң.', 'ақп.', 'нау.', 'сәу.', 'мам.', 'мау.', 'шіл.', 'там.', 'қыр.', 'қаз.', 'қар.', 'жел.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function formatMaterialDate(iso: string): string {
  const d = new Date(iso);
  const month = pick(MONTHS)[d.getMonth()];
  if (getLang() === 'en') return `${month} ${d.getDate()}, ${d.getFullYear()}`;
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

export type MaterialRequestWithTeacher = MaterialRequest & {
  teacher: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};

const TEACHER_SELECT = 'teacher:teacher_id ( id, full_name, avatar_url )';

// Преподаватель получает свои заявки, Администрация — все (это решает сервер).
export async function fetchMaterialRequests(teacherId?: string): Promise<MaterialRequestWithTeacher[]> {
  let request = supabase
    .from('material_requests')
    .select(`*, ${TEACHER_SELECT}`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (teacherId) request = request.eq('teacher_id', teacherId);
  const { data, error } = await request;
  if (error) throw error;
  return (data as MaterialRequestWithTeacher[]) ?? [];
}

export async function fetchMaterialRequest(id: string): Promise<MaterialRequestWithTeacher | null> {
  const { data, error } = await supabase
    .from('material_requests')
    .select(`*, ${TEACHER_SELECT}`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as MaterialRequestWithTeacher | null;
}

export async function createMaterialRequest(input: {
  material: string;
  quantity: number;
  unit: MaterialUnit;
  comment: string | null;
}): Promise<void> {
  const { error } = await supabase.from('material_requests').insert(input);
  if (error) throw error;
}

export async function cancelMaterialRequest(id: string): Promise<void> {
  const { error } = await supabase.from('material_requests').delete().eq('id', id);
  if (error) throw error;
}

export async function decideMaterialRequest(
  id: string,
  status: MaterialRequestStatus,
  issuedQuantity: number | null,
  note: string | null
): Promise<void> {
  const { error } = await supabase.rpc('decide_material_request', {
    p_request_id: id,
    p_status: status,
    p_issued_quantity: issuedQuantity,
    p_note: note,
  });
  if (error) throw error;
}

export interface MaterialUsageRow {
  material: string;
  unit: MaterialUnit;
  teacher_id: string;
  teacher_name: string;
  total_quantity: number;
  requests_count: number;
}

export interface MaterialUsageItem {
  material: string;
  unit: MaterialUnit;
  total: number;
  requests: number;
  teachers: { id: string; name: string; total: number }[];
}

// Сводка выданного за период: материал + единица, внутри — по преподавателям.
// Названия сравниваются без учёта регистра: «Гуашь» и «гуашь» — одно и то же.
export async function fetchMaterialUsage(from: string, to: string): Promise<MaterialUsageItem[]> {
  const { data, error } = await supabase.rpc('material_usage_summary', { p_from: from, p_to: to });
  if (error) throw error;
  const items = new Map<string, MaterialUsageItem>();
  for (const row of (data as MaterialUsageRow[]) ?? []) {
    const key = `${row.material.trim().toLowerCase()}|${row.unit}`;
    let item = items.get(key);
    if (!item) {
      item = { material: row.material.trim(), unit: row.unit, total: 0, requests: 0, teachers: [] };
      items.set(key, item);
    }
    const qty = Number(row.total_quantity);
    item.total += qty;
    item.requests += Number(row.requests_count);
    const teacher = item.teachers.find((t) => t.id === row.teacher_id);
    if (teacher) teacher.total += qty;
    else item.teachers.push({ id: row.teacher_id, name: row.teacher_name, total: qty });
  }
  return [...items.values()]
    .map((item) => ({ ...item, teachers: item.teachers.sort((a, b) => b.total - a.total) }))
    .sort((a, b) => a.material.localeCompare(b.material));
}
