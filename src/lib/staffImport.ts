// Разбор списка сотрудников из шаблона Excel «Шаблон_сотрудники_KasteyevSchool».
// Столбцы: № · ФИО · Должность · Филиал · Телефон · E-mail · Группы.
// Скопированные из Excel строки разделены табуляцией; столбец «№» и пустые
// ячейки слева пропускаем — ФИО ищем как первую ячейку с буквами.

export type InviteRole = 'staff' | 'office' | 'admin';

export interface StaffRow {
  name: string;
  role: InviteRole | null; // null — должность не распознана
  roleText: string;
  branchAdmin: boolean; // «Администратор филиала»: после регистрации назначить филиал
  branch: string;
  phone: string;
}

export function parseRole(text: string): { role: InviteRole | null; branchAdmin: boolean } {
  const t = text.toLowerCase();
  if (t.includes('филиал')) return { role: 'staff', branchAdmin: true };
  if (t.includes('офис') || t.includes('администрация')) return { role: 'office', branchAdmin: false };
  if (t.includes('администратор')) return { role: 'admin', branchAdmin: false };
  if (t.includes('преподав') || t.includes('педагог') || t.includes('учител')) return { role: 'staff', branchAdmin: false };
  return { role: null, branchAdmin: false };
}

export function parseStaffRows(text: string): StaffRow[] {
  const rows: StaffRow[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('\t').map((c) => c.replace(/\s+/g, ' ').trim());
    const idx = cells.findIndex((c) => /\p{L}/u.test(c));
    if (idx < 0) continue;
    const name = cells[idx].replace(/^\d+\s*[.)]\s*/, '');
    if (/^ф\.?\s?и\.?\s?о/i.test(name)) continue; // строка заголовков
    const key = name.toLowerCase().replace(/ё/g, 'е');
    if (seen.has(key)) continue;
    seen.add(key);
    const roleText = cells[idx + 1] ?? '';
    const { role, branchAdmin } = parseRole(roleText);
    rows.push({ name, role, roleText, branchAdmin, branch: cells[idx + 2] ?? '', phone: cells[idx + 3] ?? '' });
  }
  return rows;
}
