import { supabase } from './supabase';
import { getLang, pick, type Translations } from '../i18n';
import type { Branch, MaterialRequest, MaterialRequestStatus, MaterialUnit, Profile } from '../types/database';

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

// «12 500 ₸»
export function formatMoney(value: number): string {
  const n = Math.round(Number(value));
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')}\u00a0₸`;
}

export type MaterialRequestWithTeacher = MaterialRequest & {
  teacher: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  branch: Pick<Branch, 'id' | 'name'> | null;
};

const TEACHER_SELECT = 'teacher:teacher_id ( id, full_name, avatar_url ), branch:branch_id ( id, name )';

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase.from('branches').select('*').order('sort_order');
  if (error) throw error;
  return (data as Branch[]) ?? [];
}

// Филиал, которым руководит пользователь (или null). Свой видит каждый,
// чужие — Администрация и администратор.
export async function fetchHeadedBranch(userId: string): Promise<Branch | null> {
  const { data, error } = await supabase
    .from('branch_heads')
    .select('branch:branch_id ( id, name, sort_order )')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return ((data as { branch: Branch | null } | null)?.branch) ?? null;
}

export async function setBranchHead(userId: string, branchId: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_branch_head', { p_user_id: userId, p_branch_id: branchId });
  if (error) throw error;
}

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
  note: string | null,
  cost: number | null
): Promise<void> {
  const { error } = await supabase.rpc('decide_material_request', {
    p_request_id: id,
    p_status: status,
    p_issued_quantity: issuedQuantity,
    p_note: note,
    p_cost: cost,
  });
  if (error) throw error;
}

export interface MaterialUsageRow {
  branch_id: string | null;
  branch_name: string;
  material: string;
  unit: MaterialUnit;
  teacher_id: string;
  teacher_name: string;
  total_quantity: number;
  total_cost: number;
  requests_count: number;
}

export interface MaterialUsageItem {
  material: string;
  unit: MaterialUnit;
  total: number;
  cost: number;
  requests: number;
  // Разбивка: по филиалам (в сводке по материалам) или по руководителям (внутри филиала).
  parts: { id: string; name: string; total: number; cost: number }[];
}

export interface BranchUsage {
  id: string;
  name: string;
  cost: number;
  requests: number;
  materials: MaterialUsageItem[];
}

export interface MaterialUsage {
  branches: BranchUsage[];
  materials: MaterialUsageItem[];
  totalCost: number;
}

function addTo(
  items: Map<string, MaterialUsageItem>,
  row: MaterialUsageRow,
  part: { id: string; name: string }
) {
  const key = `${row.material.trim().toLowerCase()}|${row.unit}`;
  let item = items.get(key);
  if (!item) {
    item = { material: row.material.trim(), unit: row.unit, total: 0, cost: 0, requests: 0, parts: [] };
    items.set(key, item);
  }
  const qty = Number(row.total_quantity);
  const cost = Number(row.total_cost);
  item.total += qty;
  item.cost += cost;
  item.requests += Number(row.requests_count);
  const existing = item.parts.find((p) => p.id === part.id);
  if (existing) {
    existing.total += qty;
    existing.cost += cost;
  } else {
    item.parts.push({ ...part, total: qty, cost });
  }
}

function sortItems(items: Map<string, MaterialUsageItem>): MaterialUsageItem[] {
  return [...items.values()]
    .map((item) => ({ ...item, parts: item.parts.sort((a, b) => b.total - a.total) }))
    .sort((a, b) => a.material.localeCompare(b.material));
}

// Сводка выданного за период: по филиалам (внутри — материалы и руководители)
// и по материалам (внутри — филиалы). «Гуашь» и «гуашь» — одно и то же.
export async function fetchMaterialUsage(from: string, to: string, noBranch: string): Promise<MaterialUsage> {
  const { data, error } = await supabase.rpc('material_usage_summary', { p_from: from, p_to: to });
  if (error) throw error;
  const branchOrder: string[] = [];
  const branches = new Map<string, { id: string; name: string; cost: number; requests: number; items: Map<string, MaterialUsageItem> }>();
  const materials = new Map<string, MaterialUsageItem>();
  let totalCost = 0;
  for (const row of (data as MaterialUsageRow[]) ?? []) {
    const branchId = row.branch_id ?? 'none';
    const branchName = row.branch_name || noBranch;
    let branch = branches.get(branchId);
    if (!branch) {
      branch = { id: branchId, name: branchName, cost: 0, requests: 0, items: new Map() };
      branches.set(branchId, branch);
      branchOrder.push(branchId);
    }
    branch.cost += Number(row.total_cost);
    branch.requests += Number(row.requests_count);
    totalCost += Number(row.total_cost);
    addTo(branch.items, row, { id: row.teacher_id, name: row.teacher_name });
    addTo(materials, row, { id: branchId, name: branchName });
  }
  return {
    branches: branchOrder.map((id) => {
      const b = branches.get(id)!;
      return { id: b.id, name: b.name, cost: b.cost, requests: b.requests, materials: sortItems(b.items) };
    }),
    materials: sortItems(materials),
    totalCost,
  };
}
