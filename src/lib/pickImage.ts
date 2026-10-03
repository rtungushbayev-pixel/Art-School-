import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pick } from '../i18n';

const STRINGS = {
  ru: {
    takePhoto: 'Сделать фото',
    chooseFromGallery: 'Выбрать из галереи',
    cancel: 'Отмена',
    cameraAccess: 'Нужен доступ к камере',
    galleryAccess: 'Нужен доступ к галерее',
  },
  kk: {
    takePhoto: 'Суретке түсіру',
    chooseFromGallery: 'Галереядан таңдау',
    cancel: 'Болдырмау',
    cameraAccess: 'Камераға рұқсат қажет',
    galleryAccess: 'Галереяға рұқсат қажет',
  },
  en: {
    takePhoto: 'Take photo',
    chooseFromGallery: 'Choose from gallery',
    cancel: 'Cancel',
    cameraAccess: 'Camera access is required',
    galleryAccess: 'Photo library access is required',
  },
};

export type ImageSource = 'camera' | 'library';

export function askImageSource(title: string): Promise<ImageSource | null> {
  const s = pick(STRINGS);
  return new Promise((resolve) => {
    Alert.alert(title, undefined, [
      { text: s.takePhoto, onPress: () => resolve('camera') },
      { text: s.chooseFromGallery, onPress: () => resolve('library') },
      { text: s.cancel, style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

// Снимок с камеры или фото из галереи телефона, обрезанное до квадрата.
export async function pickImage(source: ImageSource): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    const s = pick(STRINGS);
    Alert.alert(source === 'camera' ? s.cameraAccess : s.galleryAccess);
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

// Несколько фото из галереи сразу (без обрезки: при множественном выборе
// система её не поддерживает).
export async function pickImagesFromLibrary(limit: number): Promise<ImagePicker.ImagePickerAsset[]> {
  if (limit <= 0) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(pick(STRINGS).galleryAccess);
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit);
}
