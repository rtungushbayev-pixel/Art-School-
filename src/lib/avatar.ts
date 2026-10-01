import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

type Source = 'camera' | 'library';

function askSource(): Promise<Source | null> {
  return new Promise((resolve) => {
    Alert.alert('Фото профиля', undefined, [
      { text: 'Сделать фото', onPress: () => resolve('camera') },
      { text: 'Выбрать из галереи', onPress: () => resolve('library') },
      { text: 'Отмена', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

async function pickImage(source: Source): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(source === 'camera' ? 'Нужен доступ к камере' : 'Нужен доступ к галерее');
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

/**
 * Спрашивает, откуда взять фото, загружает его в бакет avatars и возвращает
 * публичную ссылку. null — если пользователь передумал.
 */
export async function pickAndUploadAvatar(profileId: string): Promise<string | null> {
  const source = await askSource();
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
