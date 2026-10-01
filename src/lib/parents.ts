import { supabase } from './supabase';
import { pick } from '../i18n';
import type { Attendance, Profile, ProgressNote, StudentPhoto } from '../types/database';

export interface ProgressNoteWithAuthor extends ProgressNote {
  author: { id: string; full_name: string } | null;
}

export async function fetchChildren(parentId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('parent_children')
    .select('profiles:student_id ( * )')
    .eq('parent_id', parentId);
  if (error) throw error;
  return ((data as any[]) ?? [])
    .map((row) => row.profiles as Profile)
    .filter(Boolean)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function fetchParents(studentId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('parent_children')
    .select('profiles:parent_id ( * )')
    .eq('student_id', studentId);
  if (error) throw error;
  return ((data as any[]) ?? []).map((row) => row.profiles as Profile).filter(Boolean);
}

export async function fetchStudentsNotLinked(parentId: string, query: string): Promise<Profile[]> {
  const linked = await fetchChildren(parentId);
  const linkedIds = linked.map((c) => c.id);

  let request = supabase.from('profiles').select('*').eq('role', 'student').order('full_name');
  if (query.trim()) {
    request = request.ilike('full_name', `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return ((data as Profile[]) ?? []).filter((p) => !linkedIds.includes(p.id));
}

export async function linkChild(parentId: string, studentId: string) {
  const { error } = await supabase.from('parent_children').insert({ parent_id: parentId, student_id: studentId });
  if (error) throw error;
}

export async function unlinkChild(parentId: string, studentId: string) {
  const { error } = await supabase
    .from('parent_children')
    .delete()
    .eq('parent_id', parentId)
    .eq('student_id', studentId);
  if (error) throw error;
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  let request = supabase.from('profiles').select('*').order('full_name').limit(50);
  if (query.trim()) {
    request = request.ilike('full_name', `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function fetchProgressNotes(studentId: string): Promise<ProgressNoteWithAuthor[]> {
  const { data, error } = await supabase
    .from('progress_notes')
    .select('*, author:author_id ( id, full_name )')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProgressNoteWithAuthor[]) ?? [];
}

export async function addProgressNote(note: {
  studentId: string;
  title: string;
  body: string;
  rating: number | null;
}) {
  // author_id проставляет триггер в базе.
  const { error } = await supabase.from('progress_notes').insert({
    student_id: note.studentId,
    title: note.title,
    body: note.body || null,
    rating: note.rating,
  });
  if (error) throw error;
}

export async function deleteProgressNote(noteId: string) {
  const { error } = await supabase.from('progress_notes').delete().eq('id', noteId);
  if (error) throw error;
}

export async function fetchStudentAttendance(studentId: string, sinceISODate: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .gte('lesson_date', sinceISODate)
    .order('lesson_date', { ascending: false });
  if (error) throw error;
  return (data as Attendance[]) ?? [];
}

export async function fetchStudentGroupNames(studentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups:group_id ( name )')
    .eq('student_id', studentId);
  if (error) throw error;
  return ((data as any[]) ?? []).map((row) => row.groups?.name as string).filter(Boolean);
}

const PHOTOS_BUCKET = 'student-photos';
// Бакет закрытый, поэтому фото показываются по временным ссылкам.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface StudentPhotoWithUrl extends StudentPhoto {
  url: string | null;
}

export async function fetchStudentPhotos(studentId: string): Promise<StudentPhotoWithUrl[]> {
  const { data, error } = await supabase
    .from('student_photos')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const photos = (data as StudentPhoto[]) ?? [];
  if (photos.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(
      photos.map((p) => p.storage_path),
      SIGNED_URL_TTL_SECONDS
    );
  if (signError) throw signError;
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return photos.map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? null }));
}

export async function uploadStudentPhoto(params: {
  studentId: string;
  uri: string;
  mimeType?: string | null;
  caption: string;
}) {
  const ext = params.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${params.studentId}/${Date.now()}.${ext}`;
  const response = await fetch(params.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, arrayBuffer, { contentType: params.mimeType ?? 'image/jpeg' });
  if (uploadError) throw uploadError;

  // uploaded_by проставляет триггер в базе.
  const { error } = await supabase.from('student_photos').insert({
    student_id: params.studentId,
    storage_path: path,
    caption: params.caption || null,
  });
  if (error) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    throw error;
  }
}

export async function deleteStudentPhoto(photo: StudentPhoto) {
  const { error } = await supabase.from('student_photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
}

// Заявки родителей на привязку ребёнка (подтверждает сотрудник).
export interface ParentLinkRequest {
  id: string;
  created_at: string;
  parent: Profile | null;
  student: Profile | null;
}

export async function fetchParentLinkRequests(parentId?: string): Promise<ParentLinkRequest[]> {
  let request = supabase
    .from('parent_link_requests')
    .select('id, created_at, parent:parent_id ( * ), student:student_id ( * )')
    .order('created_at', { ascending: true });
  if (parentId) request = request.eq('parent_id', parentId);
  const { data, error } = await request;
  if (error) throw error;
  return (data as unknown as ParentLinkRequest[]) ?? [];
}

const LINK_ERRORS = {
  ru: {
    alreadySent: 'Заявка на этого ребёнка уже отправлена.',
    alreadyLinked: 'Этот ребёнок уже привязан к вам.',
  },
  kk: {
    alreadySent: 'Бұл балаға өтінім әлдеқашан жіберілген.',
    alreadyLinked: 'Бұл бала сізге әлдеқашан тіркелген.',
  },
  en: {
    alreadySent: 'A request for this child has already been sent.',
    alreadyLinked: 'This child is already linked to you.',
  },
};

export async function requestChildLink(parentId: string, studentId: string) {
  const { error } = await supabase.from('parent_link_requests').insert({ parent_id: parentId, student_id: studentId });
  if (error) {
    if (error.code === '23505') throw new Error(pick(LINK_ERRORS).alreadySent);
    if (error.message.includes('child_already_linked')) throw new Error(pick(LINK_ERRORS).alreadyLinked);
    throw error;
  }
}

export async function cancelChildLinkRequest(requestId: string) {
  const { error } = await supabase.from('parent_link_requests').delete().eq('id', requestId);
  if (error) throw error;
}

export async function approveChildLinkRequest(requestId: string) {
  const { error } = await supabase.rpc('approve_parent_link_request', { p_request_id: requestId });
  if (error) throw error;
}
