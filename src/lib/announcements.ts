import { supabase } from './supabase';
import type { Announcement } from '../types/database';

export interface AnnouncementWithAuthor extends Announcement {
  author: { full_name: string } | null;
}

export async function resolveAudienceRecipientIds(
  audience: Announcement['audience'],
  groupId: string | null
): Promise<string[]> {
  if (audience === 'group') {
    if (!groupId) return [];
    const { data, error } = await supabase.from('group_members').select('student_id').eq('group_id', groupId);
    if (error) throw error;
    return (data ?? []).map((row) => row.student_id);
  }

  let request = supabase.from('profiles').select('id');
  if (audience === 'students') request = request.eq('role', 'student');
  if (audience === 'staff') request = request.eq('role', 'staff');

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

export async function fetchAnnouncements(): Promise<AnnouncementWithAuthor[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, author:author_id ( full_name )')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as AnnouncementWithAuthor[]) ?? [];
}
