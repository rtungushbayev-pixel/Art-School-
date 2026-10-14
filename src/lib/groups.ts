import { supabase } from './supabase';
import type { Profile } from '../types/database';

export async function fetchStaffProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').in('role', ['staff', 'admin']).order('full_name');
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

export interface GroupTeacherRequest {
  id: string;
  group_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  requester: { full_name: string } | null;
}

// Запросы на замену преподавателя группы: свои видит преподаватель,
// все — администратор (RLS group_teacher_requests_select).
export async function fetchGroupTeacherRequests(groupId: string): Promise<GroupTeacherRequest[]> {
  const { data, error } = await supabase
    .from('group_teacher_requests')
    .select('id, group_id, requested_by, status, created_at, requester:requested_by ( full_name )')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw error;
  return (data as unknown as GroupTeacherRequest[]) ?? [];
}

export async function requestGroupTakeover(groupId: string): Promise<string> {
  const { data, error } = await supabase.rpc('request_group_takeover', { p_group_id: groupId });
  if (error) throw error;
  return data as string;
}

export async function decideGroupRequest(requestId: string, approve: boolean) {
  const { error } = await supabase.rpc('decide_group_request', { p_request_id: requestId, p_approve: approve });
  if (error) throw error;
}
