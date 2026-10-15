// Телефон Казахстана в виде «+7 (701) 234-56-78». Ввод «8 701…» или без
// кода страны тоже превращается в +7; лишние цифры отбрасываются.
export function formatKzPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits && !digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const rest = digits.slice(1);
  if (!digits) return '';
  let out = '+7';
  // Скобку и разделители ставим только перед следующими цифрами,
  // иначе стирание с конца «застревало» бы на них.
  if (rest.length > 0) out += ` (${rest.slice(0, 3)}`;
  if (rest.length > 3) out += `) ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
  return out;
}

export function isCompleteKzPhone(value: string): boolean {
  return value.replace(/\D/g, '').length === 11;
}

// Начальное значение поля: «+7 », дальше человек вводит номер.
export const KZ_PHONE_PREFIX = '+7 ';

// Обработчик ввода: стирание до «+7» оставляет префикс.
export function onKzPhoneInput(text: string): string {
  const formatted = formatKzPhone(text);
  return formatted === '+7' || formatted === '' ? KZ_PHONE_PREFIX : formatted;
}
