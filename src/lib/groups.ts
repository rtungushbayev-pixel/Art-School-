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
  kind: 'takeover' | 'replacement';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  taken_by: string | null;
  created_at: string;
  requester: { full_name: string } | null;
}

const REQUEST_FIELDS = 'id, group_id, requested_by, kind, status, taken_by, created_at, requester:requested_by ( full_name )';

// Открытые запросы по группе: свои видит преподаватель, запросы на замену —
// все сотрудники, всё — администратор (RLS group_teacher_requests_select).
export async function fetchGroupTeacherRequests(groupId: string): Promise<GroupTeacherRequest[]> {
  const { data, error } = await supabase
    .from('group_teacher_requests')
    .select(REQUEST_FIELDS)
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw error;
  return (data as unknown as GroupTeacherRequest[]) ?? [];
}

// Я просил замену, и группу до сих пор ведёт тот, кто меня заменил, —
// значит, могу вернуть группу себе без администратора.
export async function canReturnGroup(groupId: string, myId: string, teacherId: string | null): Promise<boolean> {
  if (!teacherId) return false;
  const { data, error } = await supabase
    .from('group_teacher_requests')
    .select('id')
    .eq('group_id', groupId)
    .eq('requested_by', myId)
    .eq('kind', 'replacement')
    .eq('status', 'approved')
    .eq('taken_by', teacherId)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

export async function requestGroupTakeover(groupId: string): Promise<string> {
  const { data, error } = await supabase.rpc('request_group_takeover', { p_group_id: groupId });
  if (error) throw error;
  return data as string;
}

export async function requestGroupReplacement(groupId: string): Promise<string> {
  const { data, error } = await supabase.rpc('request_group_replacement', { p_group_id: groupId });
  if (error) throw error;
  return data as string;
}

export async function cancelGroupReplacement(requestId: string) {
  const { error } = await supabase.rpc('cancel_group_replacement', { p_request_id: requestId });
  if (error) throw error;
}

export async function decideGroupRequest(requestId: string, approve: boolean) {
  const { error } = await supabase.rpc('decide_group_request', { p_request_id: requestId, p_approve: approve });
  if (error) throw error;
}
