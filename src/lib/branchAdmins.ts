import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Profile } from '../types/database';

// Администратор филиала: преподаватель, который ведёт группы одного филиала
// (миграция 0052_branch_admins). Права проверяет сервер, здесь — что показать.

export async function fetchAdminBranchIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('branch_admins').select('branch_id').eq('user_id', userId);
  if (error) throw error;
  return ((data as { branch_id: string }[] | null) ?? []).map((r) => r.branch_id);
}

export async function setBranchAdmin(userId: string, branchId: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_branch_admin', { p_user_id: userId, p_branch_id: branchId });
  if (error) throw error;
}

// Филиалы, которые ведёт текущий пользователь (пусто — не администратор филиала).
export function useAdminBranchIds(profile: Profile | null): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (!profile || profile.role !== 'staff') {
      setIds([]);
      return;
    }
    let cancelled = false;
    fetchAdminBranchIds(profile.id)
      .then((list) => {
        if (!cancelled) setIds(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile]);
  return ids;
}
