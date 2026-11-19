import { pick, type Lang } from '../i18n';

// Подгруппы внутри филиала: детские группы по возрасту, затем 0–6 курс, затем прочие.
const LABELS = {
  ru: { younger: 'Младшие', middle: 'Средние', older: 'Старшие', weekend: 'Выходного дня (ГВД)', course: (n: number) => `${n} курс`, other: 'Другие' },
  kk: { younger: 'Кішілер', middle: 'Ортаңғылар', older: 'Үлкендер', weekend: 'Демалыс күні (ГВД)', course: (n: number) => `${n}-курс`, other: 'Басқалары' },
  en: { younger: 'Younger', middle: 'Middle', older: 'Older', weekend: 'Weekend (GVD)', course: (n: number) => `Year ${n}`, other: 'Other' },
};

export interface GroupSection<T> {
  key: string;
  title: string;
  groups: T[];
}

function sectionOf(group: { name: string; course?: number | null }): { key: string; order: number } {
  if (group.course !== null && group.course !== undefined) return { key: `c${group.course}`, order: 10 + group.course };
  const name = group.name.toLowerCase();
  if (name.startsWith('младш') || name.includes(' младш')) return { key: 'younger', order: 1 };
  if (name.startsWith('средн') || name.includes(' средн')) return { key: 'middle', order: 2 };
  if (name.startsWith('старш') || name.includes(' старш')) return { key: 'older', order: 3 };
  if (name.startsWith('гвд')) return { key: 'weekend', order: 4 };
  return { key: 'other', order: 99 };
}

export function groupSections<T extends { name: string; course?: number | null }>(groups: T[], lang?: Lang): GroupSection<T>[] {
  const l = pick(LABELS, lang);
  const map = new Map<string, { order: number; groups: T[] }>();
  for (const g of groups) {
    const { key, order } = sectionOf(g);
    if (!map.has(key)) map.set(key, { order, groups: [] });
    map.get(key)!.groups.push(g);
  }
  const title = (key: string) =>
    key.startsWith('c') ? l.course(Number(key.slice(1))) : (l[key as 'younger' | 'middle' | 'older' | 'weekend' | 'other'] as string);
  return [...map.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, v]) => ({
      key,
      title: title(key),
      groups: v.groups.sort((a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true, sensitivity: 'base' })),
    }));
}
