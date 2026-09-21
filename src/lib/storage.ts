import { supabase } from './supabase';

export async function uploadImageAsset(
  bucket: string,
  ownerId: string,
  uri: string,
  mimeType?: string | null
): Promise<string> {
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${ownerId}/${Date.now()}.${ext}`;
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: mimeType ?? 'image/jpeg' });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
