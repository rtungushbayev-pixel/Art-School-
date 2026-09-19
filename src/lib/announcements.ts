import { supabase } from './supabase';
import type { Announcement } from '../types/database';

export interface AnnouncementWithAuthor extends Announcement {
  author: { full_name: string } | null;
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
