import type { ImagePickerAsset } from 'expo-image-picker';
import { shrinkAsset } from './imageResize';
import { supabase } from './supabase';

// Сторис Комьюнити: фото на 24 часа (миграция 0050, функция moderate-story).

export interface Story {
  id: string;
  author_id: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  ai_reason: string | null;
  created_at: string;
  seen: boolean;
  viewCount: number;
}

export interface StoryAuthor {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// Все сторис одного человека — один кружок в ленте.
export interface StoryGroup {
  author: StoryAuthor;
  stories: Story[];
  allSeen: boolean;
}

interface RawStory {
  id: string;
  author_id: string;
  image_url: string;
  status: Story['status'];
  ai_reason: string | null;
  created_at: string;
  profiles: StoryAuthor | null;
  story_views: { viewer_id: string }[];
}

// Живые сторис, по кружку на автора: свои первыми, потом непросмотренные, потом свежие.
export async function fetchStoryGroups(viewerId: string): Promise<StoryGroup[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(
      'id, author_id, image_url, status, ai_reason, created_at, profiles:author_id ( id, full_name, avatar_url ), story_views ( viewer_id )'
    )
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  const groups = new Map<string, StoryGroup>();
  for (const raw of (data as unknown as RawStory[]) ?? []) {
    if (!raw.profiles) continue;
    // Чужие — только одобренные (сотрудник видит и непроверенные, но в ленте они ни к чему).
    if (raw.author_id !== viewerId && raw.status !== 'approved') continue;
    const story: Story = {
      id: raw.id,
      author_id: raw.author_id,
      image_url: raw.image_url,
      status: raw.status,
      ai_reason: raw.ai_reason,
      created_at: raw.created_at,
      seen: raw.author_id === viewerId || (raw.story_views ?? []).some((v) => v.viewer_id === viewerId),
      viewCount: (raw.story_views ?? []).filter((v) => v.viewer_id !== raw.author_id).length,
    };
    const group = groups.get(raw.author_id) ?? { author: raw.profiles, stories: [], allSeen: true };
    group.stories.push(story);
    group.allSeen = group.allSeen && story.seen;
    groups.set(raw.author_id, group);
  }
  const latest = (g: StoryGroup) => g.stories[g.stories.length - 1].created_at;
  return [...groups.values()].sort((a, b) => {
    if (a.author.id === viewerId) return -1;
    if (b.author.id === viewerId) return 1;
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    return latest(b).localeCompare(latest(a));
  });
}

// Загрузка фото и запуск проверки. Возвращает решение проверки или null,
// если проверка не успела (тогда сторис пока видна только автору).
export async function publishStory(
  authorId: string,
  original: ImagePickerAsset
): Promise<'approve' | 'reject' | 'review' | null> {
  const asset = await shrinkAsset(original, 1280);
  const path = `${authorId}/${Date.now()}.jpg`;
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('stories')
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (uploadError) throw uploadError;
  const image_url = supabase.storage.from('stories').getPublicUrl(path).data.publicUrl;
  const { data: story, error } = await supabase
    .from('stories')
    .insert({ author_id: authorId, image_path: path, image_url })
    .select('id')
    .single();
  if (error) {
    await supabase.storage.from('stories').remove([path]);
    throw error;
  }
  try {
    const { data } = await supabase.functions.invoke('moderate-story', { body: { storyId: story.id } });
    return (data as { decision?: 'approve' | 'reject' | 'review' })?.decision ?? null;
  } catch {
    return null;
  }
}

export async function markStorySeen(storyId: string): Promise<void> {
  await supabase.from('story_views').upsert({ story_id: storyId }, { onConflict: 'story_id,viewer_id', ignoreDuplicates: true });
}

export async function deleteStory(story: Pick<Story, 'id' | 'image_url' | 'author_id'>): Promise<void> {
  const { error } = await supabase.from('stories').delete().eq('id', story.id);
  if (error) throw error;
  // Файл удаляется из своей папки; если сторис убрал сотрудник, файл автора остаётся (редкий случай, он маленький).
  const path = story.image_url.split('/stories/')[1];
  if (path) await supabase.storage.from('stories').remove([decodeURIComponent(path)]);
}
