import { supabase } from './supabase';
import type { SignUpAccountType } from '../hooks/useAuth';

// Телефон: только цифры и «+», от 10 до 15 цифр (как проверяет сервер).
export function normalizePhone(value: string): string {
  return value.replace(/[^0-9+]/g, '');
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// Проверка кода до создания аккаунта: сервер отвечает только «подходит или нет».
export async function checkSignupCode(
  accountType: SignUpAccountType,
  code: string,
  groupId: string | null
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_signup_code', {
    p_account_type: accountType,
    p_code: code,
    p_group_id: groupId,
  });
  if (error) throw error;
  return data === true;
}

// Родитель добавляет ещё одного ребёнка по коду из школы.
export async function linkChildByCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('link_child_by_code', { p_code: code });
  if (error) {
    if (error.message.includes('too_many_parents')) throw new Error('too_many_parents');
    if (error.message.includes('rate_limited')) throw new Error('rate_limited');
    throw error;
  }
  return data === true;
}
