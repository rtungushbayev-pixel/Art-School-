import { supabase } from './supabase';
import type { Profile } from '../types/database';

export async function fetchStaffProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'staff').order('full_name');
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function fetchGroupMembers(groupId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('profiles:student_id ( * )')
    .eq('group_id', groupId);
  if (error) throw error;
  return ((data as any[]) ?? []).map((row) => row.profiles as Profile).filter(Boolean);
}

export async function fetchStudentsNotInGroup(groupId: string, query: string): Promise<Profile[]> {
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('student_id')
    .eq('group_id', groupId);
  if (membersError) throw membersError;
  const memberIds = (members ?? []).map((m) => m.student_id);

  let request = supabase.from('profiles').select('*').eq('role', 'student').order('full_name');
  if (query.trim()) {
    request = request.ilike('full_name', `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return ((data as Profile[]) ?? []).filter((p) => !memberIds.includes(p.id));
}

export async function addStudentToGroup(groupId: string, studentId: string) {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, student_id: studentId });
  if (error) throw error;
}

export async function removeStudentFromGroup(groupId: string, studentId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', studentId);
  if (error) throw error;
}
