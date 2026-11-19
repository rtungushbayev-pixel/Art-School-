import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FEATURES } from '../lib/features';
import type { Profile } from '../types/database';

// Филиалы без QR-отметки: в Ауэзова отмечаются по лицу (Битрикс24), и раздел
// «Сканировать QR» там только путает учеников.
const BRANCHES_WITHOUT_QR = ['3dc6b9d2-8acc-43c0-965e-1cf949ebadb0']; // Ауэзова

// Показывать ли вкладку «Сканировать QR»: ученику — если хоть одна его группа
// в филиале с QR, родителю — то же для групп его детей.
export function useQrCheckInAvailable(profile: Profile | null): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!FEATURES.qrCheckIn || !profile || (profile.role !== 'student' && profile.role !== 'parent')) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    (async () => {
      let studentIds = [profile.id];
      if (profile.role === 'parent') {
        const { data } = await supabase.from('parent_children').select('student_id').eq('parent_id', profile.id);
        studentIds = ((data as { student_id: string }[] | null) ?? []).map((r) => r.student_id);
      }
      if (studentIds.length === 0) return;
      const { data } = await supabase.from('group_members').select('groups ( branch_id )').in('student_id', studentIds);
      const branchIds = ((data as unknown as { groups: { branch_id: string | null } | null }[] | null) ?? []).map(
        (r) => r.groups?.branch_id ?? null
      );
      if (!cancelled) setAvailable(branchIds.some((id) => !!id && !BRANCHES_WITHOUT_QR.includes(id)));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile]);

  return available;
}
