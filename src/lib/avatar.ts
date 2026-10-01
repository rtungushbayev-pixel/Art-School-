import { supabase } from './supabase';
import { askImageSource, pickImage } from './pickImage';
import { pick } from '../i18n';

const STRINGS = {
  ru: { profilePhoto: 'Фото профиля' },
  kk: { profilePhoto: 'Профиль фотосы' },
  en: { profilePhoto: 'Profile photo' },
};

/**
 * Спрашивает, откуда взять фото, загружает его в бакет avatars и возвращает
 * публичную ссылку. null — если пользователь передумал.
 */
export async function pickAndUploadAvatar(profileId: string): Promise<string | null> {
  const source = await askImageSource(pick(STRINGS).profilePhoto);
  if (!source) return null;
  const asset = await pickImage(source);
  if (!asset) return null;

  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${profileId}/avatar.${ext}`;
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Имя файла не меняется, поэтому добавляем метку, чтобы не показался старый снимок из кэша.
  return `${data.publicUrl}?t=${Date.now()}`;
}

// Загружает новое фото и сразу сохраняет его в профиле.
export async function changeProfileAvatar(profileId: string): Promise<boolean> {
  const url = await pickAndUploadAvatar(profileId);
  if (!url) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', profileId);
  if (error) throw error;
  return true;
}
