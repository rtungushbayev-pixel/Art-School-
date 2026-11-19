import React, { useState } from 'react';
import { shrinkAsset } from '../../lib/imageResize';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { uploadStudentPhoto } from '../../lib/parents';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    needCamera: 'Нужен доступ к камере',
    needGallery: 'Нужен доступ к галерее',
    choosePhoto: 'Выберите фото',
    uploadFailed: 'Не удалось загрузить',
    hint: 'Фото увидят только ученик, его родители и сотрудники школы.',
    tapToChoose: 'Нажмите, чтобы выбрать фото',
    takePhoto: 'Сфотографировать',
    caption: 'Подпись',
    captionPlaceholder: 'Например: Акварель, 2 занятие',
    addToGallery: 'Добавить в галерею',
  },
  kk: {
    needCamera: 'Камераға рұқсат қажет',
    needGallery: 'Галереяға рұқсат қажет',
    choosePhoto: 'Фотоны таңдаңыз',
    uploadFailed: 'Жүктеу мүмкін болмады',
    hint: 'Фотоны тек оқушы, оның ата-анасы және мектеп қызметкерлері көреді.',
    tapToChoose: 'Фото таңдау үшін басыңыз',
    takePhoto: 'Суретке түсіру',
    caption: 'Жазба',
    captionPlaceholder: 'Мысалы: Акварель, 2-сабақ',
    addToGallery: 'Галереяға қосу',
  },
  en: {
    needCamera: 'Camera access is required',
    needGallery: 'Photo library access is required',
    choosePhoto: 'Choose a photo',
    uploadFailed: 'Could not upload',
    hint: 'Only the student, their parents and school staff will see this photo.',
    tapToChoose: 'Tap to choose a photo',
    takePhoto: 'Take a photo',
    caption: 'Caption',
    captionPlaceholder: 'For example: Watercolour, class 2',
    addToGallery: 'Add to gallery',
  },
};

type Props = NativeStackScreenProps<StaffStackParamList, 'AddStudentPhoto'>;

export function AddStudentPhotoScreen({ route, navigation }: Props) {
  const { studentId, studentName } = route.params;
  const s = useStrings(STRINGS);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(source === 'camera' ? s.needCamera : s.needGallery);
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) {
      setAsset(result.assets[0]);
    }
  };

  const onSave = async () => {
    if (!asset) {
      Alert.alert(s.choosePhoto);
      return;
    }
    setUploading(true);
    try {
      const small = await shrinkAsset(asset);
      await uploadStudentPhoto({ studentId, uri: small.uri, mimeType: small.mimeType, caption: caption.trim() });
      navigation.goBack();
    } catch (e) {
      Alert.alert(s.uploadFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.student}>{studentName}</Text>
      <Text style={styles.hint}>{s.hint}</Text>

      <Pressable onPress={() => pick('library')} style={styles.preview}>
        {asset ? (
          <Image source={{ uri: asset.uri }} style={styles.previewImage} contentFit="cover" />
        ) : (
          <Text style={styles.previewHint}>{s.tapToChoose}</Text>
        )}
      </Pressable>
      <Button title={s.takePhoto} variant="secondary" onPress={() => pick('camera')} />
      <View style={{ height: spacing.md }} />

      <TextField label={s.caption} value={caption} onChangeText={setCaption} placeholder={s.captionPlaceholder} />
      <Button title={s.addToGallery} onPress={onSave} loading={uploading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  student: { fontSize: 20, fontWeight: '700', color: colors.text },
  hint: { color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  preview: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  previewImage: { width: '100%', height: '100%' },
  previewHint: { color: colors.textMuted },
});
