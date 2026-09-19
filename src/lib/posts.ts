import { supabase } from './supabase';
import type { PostCardData } from '../components/PostCard';

interface RawPost {
  id: string;
  caption: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  author_id: string;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  post_images: { id: string; image_url: string; position: number }[];
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
}

const SELECT = `
  id, caption, created_at, status, author_id,
  profiles:author_id ( id, full_name, avatar_url ),
  post_images ( id, image_url, position ),
  post_likes ( user_id ),
  post_comments ( id )
`;

function toCardData(raw: RawPost, currentUserId?: string): PostCardData {
  return {
    id: raw.id,
    caption: raw.caption,
    created_at: raw.created_at,
    status: raw.status,
    author: raw.profiles,
    images: [...(raw.post_images ?? [])].sort((a, b) => a.position - b.position),
    likeCount: raw.post_likes?.length ?? 0,
    commentCount: raw.post_comments?.length ?? 0,
    likedByMe: !!currentUserId && (raw.post_likes ?? []).some((l) => l.user_id === currentUserId),
  };
}

export async function fetchFeedPosts(currentUserId?: string): Promise<PostCardData[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(SELECT)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as RawPost[]) ?? []).map((p) => toCardData(p, currentUserId));
}

export async function fetchUserPosts(userId: string, currentUserId?: string): Promise<PostCardData[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(SELECT)
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as RawPost[]) ?? []).map((p) => toCardData(p, currentUserId));
}

export async function fetchPendingPosts(currentUserId?: string): Promise<PostCardData[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data as unknown as RawPost[]) ?? []).map((p) => toCardData(p, currentUserId));
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  }
}
