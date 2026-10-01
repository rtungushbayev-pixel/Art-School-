import React, { useState } from 'react';
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

type Props = NativeStackScreenProps<StaffStackParamList, 'AddStudentPhoto'>;

export function AddStudentPhotoScreen({ route, navigation }: Props) {
  const { studentId, studentName } = route.params;
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(source === 'camera' ? 'Нужен доступ к камере' : 'Нужен доступ к галерее');
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
      Alert.alert('Выберите фото');
      return;
    }
    setUploading(true);
    try {
      await uploadStudentPhoto({ studentId, uri: asset.uri, mimeType: asset.mimeType, caption: caption.trim() });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Не удалось загрузить', e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.student}>{studentName}</Text>
      <Text style={styles.hint}>Фото увидят только ученик, его родители и сотрудники школы.</Text>

      <Pressable onPress={() => pick('library')} style={styles.preview}>
        {asset ? (
          <Image source={{ uri: asset.uri }} style={styles.previewImage} contentFit="cover" />
        ) : (
          <Text style={styles.previewHint}>Нажмите, чтобы выбрать фото</Text>
        )}
      </Pressable>
      <Button title="Сфотографировать" variant="secondary" onPress={() => pick('camera')} />
      <View style={{ height: spacing.md }} />

      <TextField label="Подпись" value={caption} onChangeText={setCaption} placeholder="Например: Акварель, 2 занятие" />
      <Button title="Добавить в галерею" onPress={onSave} loading={uploading} />
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
