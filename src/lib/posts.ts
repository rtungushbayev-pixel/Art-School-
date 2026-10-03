import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from './supabase';
import type { PostCardData } from '../components/PostCard';

interface RawPost {
  id: string;
  caption: string | null;
  title: string | null;
  technique: string | null;
  artwork_year: number | null;
  featured: boolean;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  author_id: string;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  post_images: { id: string; image_url: string; position: number }[];
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
}

const SELECT = `
  id, caption, title, technique, artwork_year, featured, created_at, status, author_id,
  profiles:author_id ( id, full_name, avatar_url ),
  post_images ( id, image_url, position ),
  post_likes ( user_id ),
  post_comments ( id )
`;

function toCardData(raw: RawPost, currentUserId?: string): PostCardData {
  return {
    id: raw.id,
    caption: raw.caption,
    title: raw.title,
    technique: raw.technique,
    artwork_year: raw.artwork_year,
    featured: raw.featured,
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

// Сколько фото можно приложить к одной публикации (так же ограничено в базе).
export const MAX_POST_PHOTOS = 10;

async function uploadPortfolioPhoto(authorId: string, asset: ImagePickerAsset, index: number): Promise<string> {
  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${authorId}/${Date.now()}-${index}.${ext}`;
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('portfolio')
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
}

// Загружает фото в бакет portfolio и создаёт публикацию (до 10 фото, в
// выбранном порядке). Публикация попадает в общую ленту после проверки.
export async function publishPost(params: {
  authorId: string;
  assets: ImagePickerAsset[];
  caption?: string | null;
  title?: string | null;
  technique?: string | null;
  artworkYear?: number | null;
}) {
  const { authorId } = params;
  const assets = params.assets.slice(0, MAX_POST_PHOTOS);
  if (assets.length === 0) throw new Error('no photos');

  const urls: string[] = [];
  for (let i = 0; i < assets.length; i += 1) {
    urls.push(await uploadPortfolioPhoto(authorId, assets[i], i));
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      caption: params.caption?.trim() || null,
      title: params.title?.trim() || null,
      technique: params.technique?.trim() || null,
      artwork_year: params.artworkYear ?? null,
    })
    .select()
    .single();
  if (postError) throw postError;

  const { error: imageError } = await supabase
    .from('post_images')
    .insert(urls.map((image_url, position) => ({ post_id: post.id, image_url, position })));
  if (imageError) throw imageError;

  return post.id as string;
}
