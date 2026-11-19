// Разбор списка учеников, вставленного из Excel, Google Таблиц или WhatsApp.
// Каждая строка — один ребёнок. Из строки берём ячейку с ФИО (в Excel ячейки
// разделены табуляцией), убираем нумерацию «1.», «2)» и лишние пробелы,
// пропускаем заголовки и тех, кто уже есть в группе.

export const MAX_IMPORT = 300;

const HEADER_WORDS = new Set(['фио', 'ф.и.о.', 'ф.и.о', 'имя', 'ученик', 'ученики', 'аты-жөні', 'name', 'full name', '№']);

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function cleanCell(cell: string): string {
  return cell
    .replace(/^\s*\d+\s*(?:[.)]\s*|\s+)/, '') // нумерация в начале строки
    .replace(/\s+/g, ' ')
    .trim();
}

function pickName(line: string): string | null {
  const cells = line.split(/\t|;/).map(cleanCell);
  // Первая ячейка, где есть буквы: номер по порядку и даты пропускаем.
  const cell = cells.find((c) => /\p{L}/u.test(c));
  if (!cell) return null;
  if (HEADER_WORDS.has(cell.toLowerCase())) return null;
  return cell;
}

export interface ImportPreview {
  toAdd: string[]; // новые, в порядке из списка
  existing: string[]; // уже есть в группе
  repeated: number; // повторы внутри вставленного текста
}

export function previewImport(text: string, existingNames: string[]): ImportPreview {
  const already = new Set(existingNames.map(normalizeName));
  const seen = new Set<string>();
  const toAdd: string[] = [];
  const existing: string[] = [];
  let repeated = 0;
  for (const line of text.split(/\r?\n/)) {
    const name = pickName(line);
    if (!name) continue;
    const key = normalizeName(name);
    if (seen.has(key)) {
      repeated += 1;
      continue;
    }
    seen.add(key);
    if (already.has(key)) existing.push(name);
    else toAdd.push(name);
  }
  return { toAdd, existing, repeated };
}
