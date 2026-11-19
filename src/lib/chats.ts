import { supabase } from './supabase';
import { sendPushNotification } from './notifications';
import type { Profile } from '../types/database';

type Person = Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;

export interface ParentChat {
  id: string;
  parent_id: string;
  teacher_id: string;
  student_id: string;
  last_message_at: string;
  parent_read_at: string;
  teacher_read_at: string;
  parent: Person | null;
  teacher: Person | null;
  student: Person | null;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

const CHAT_SELECT = `*,
  parent:parent_id ( id, full_name, avatar_url ),
  teacher:teacher_id ( id, full_name, avatar_url ),
  student:student_id ( id, full_name, avatar_url )`;

export async function fetchChats(): Promise<ParentChat[]> {
  const { data, error } = await supabase.from('parent_chats').select(CHAT_SELECT).order('last_message_at', { ascending: false });
  if (error) throw error;
  return (data as ParentChat[]) ?? [];
}

export async function fetchChat(chatId: string): Promise<ParentChat | null> {
  const { data, error } = await supabase.from('parent_chats').select(CHAT_SELECT).eq('id', chatId).maybeSingle();
  if (error) throw error;
  return data as ParentChat | null;
}

export function isUnread(chat: ParentChat, userId: string): boolean {
  const readAt = chat.parent_id === userId ? chat.parent_read_at : chat.teacher_read_at;
  return chat.last_message_at > readAt;
}

export async function fetchChatMessages(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('parent_chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at')
    .limit(500);
  if (error) throw error;
  return (data as ChatMessage[]) ?? [];
}

export async function sendChatMessage(chatId: string, body: string): Promise<void> {
  const { data, error } = await supabase
    .from('parent_chat_messages')
    .insert({ chat_id: chatId, body })
    .select('id')
    .single();
  if (error) throw error;
  if (data?.id) sendPushNotification({ event: 'chat_message', id: data.id as string });
}

export async function markChatRead(chatId: string): Promise<void> {
  await supabase.rpc('mark_chat_read', { p_chat_id: chatId });
}

export async function startChat(parentId: string, teacherId: string, studentId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_parent_chat', {
    p_parent_id: parentId,
    p_teacher_id: teacherId,
    p_student_id: studentId,
  });
  if (error) throw error;
  return String(data);
}

export interface ChildTeacher {
  teacher_id: string;
  full_name: string;
  avatar_url: string | null;
  group_name: string;
}

export async function fetchChildTeachers(studentId: string): Promise<ChildTeacher[]> {
  const { data, error } = await supabase.rpc('child_teachers', { p_student_id: studentId });
  if (error) throw error;
  return (data as ChildTeacher[]) ?? [];
}
