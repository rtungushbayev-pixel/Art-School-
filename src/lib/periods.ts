import { localISODate } from './attendance';

// Периоды для сводок. Учебный год: 1 сентября — 31 мая;
// 1 полугодие: сентябрь—декабрь, 2 полугодие: январь—май.
export type PeriodPreset = 'month' | 'half1' | 'half2' | 'year' | 'custom';

export const PERIOD_PRESETS: PeriodPreset[] = ['month', 'half1', 'half2', 'year', 'custom'];

export function presetRange(preset: Exclude<PeriodPreset, 'custom'>, now = new Date()): [string, string] {
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  switch (preset) {
    case 'month':
      return [
        localISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        localISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      ];
    case 'half1':
      return [`${startYear}-09-01`, `${startYear}-12-31`];
    case 'half2':
      return [`${startYear + 1}-01-01`, `${startYear + 1}-05-31`];
    case 'year':
      return [`${startYear}-09-01`, `${startYear + 1}-05-31`];
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidRange(from: string, to: string): boolean {
  return DATE_RE.test(from) && DATE_RE.test(to) && from <= to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to));
}
