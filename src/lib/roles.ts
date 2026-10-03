import type { UserRole } from '../types/database';

// Сотрудник школы: преподаватель (staff) или администратор (admin).
// Права проверяет сервер (is_staff / is_admin); здесь — только что показывать.
export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === 'staff' || role === 'admin';
}

// Администратор: роли, приглашения сотрудников, все группы и коды, оплаты.
export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}
