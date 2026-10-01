import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type ImageSource = 'camera' | 'library';

export function askImageSource(title: string): Promise<ImageSource | null> {
  return new Promise((resolve) => {
    Alert.alert(title, undefined, [
      { text: 'Сделать фото', onPress: () => resolve('camera') },
      { text: 'Выбрать из галереи', onPress: () => resolve('library') },
      { text: 'Отмена', style: 'cancel', onPress: () => resolve(null) },
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
