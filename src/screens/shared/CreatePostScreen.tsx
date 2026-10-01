import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { parseYear } from '../../lib/portfolio';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function CreatePostScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [technique, setTechnique] = useState('');
  const [year, setYear] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ к галерее, чтобы выбрать фото работы');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAsset(result.assets[0]);
    }
  };

  const onPublish = async () => {
    if (!profile) return;
    if (!asset) {
      Alert.alert('Выберите фото работы');
      return;
    }
    const artworkYear = parseYear(year);
    if (artworkYear === 'invalid') {
      Alert.alert('Проверьте год', 'Укажите год четырьмя цифрами, например 2026.');
      return;
    }
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('portfolio').getPublicUrl(path);

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: profile.id,
          caption: caption.trim() || null,
          title: title.trim() || null,
          technique: technique.trim() || null,
          artwork_year: artworkYear,
        })
        .select()
        .single();
      if (postError) throw postError;

      const { error: imageError } = await supabase
        .from('post_images')
        .insert({ post_id: post.id, image_url: publicUrlData.publicUrl, position: 0 });
      if (imageError) throw imageError;

      navigation.goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось опубликовать работу';
      Alert.alert('Ошибка', message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Поделиться работой</Text>

      <View style={styles.imagePicker}>
        {asset ? (
          <Image source={{ uri: asset.uri }} style={styles.preview} />
        ) : (
          <Text onPress={pickImage} style={styles.pickText}>
            Нажмите, чтобы выбрать фото
          </Text>
        )}
      </View>
      {asset ? (
        <Text onPress={pickImage} style={styles.changePhoto}>
          Выбрать другое фото
        </Text>
      ) : null}

      <TextField label="Название" placeholder="Например: «Осенний этюд»" value={title} onChangeText={setTitle} />
      <View style={styles.row}>
        <View style={styles.rowWide}>
          <TextField
            label="Техника и материалы"
            placeholder="Акварель, бумага"
            value={technique}
            onChangeText={setTechnique}
          />
        </View>
        <View style={styles.rowNarrow}>
          <TextField
            label="Год"
            placeholder={String(new Date().getFullYear())}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      <TextField
        label="Подпись"
        placeholder="Расскажите о своей работе…"
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <Button title="Опубликовать" onPress={onPublish} loading={uploading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  imagePicker: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  preview: { width: '100%', height: '100%' },
  pickText: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowWide: { flex: 2 },
  rowNarrow: { flex: 1 },
  changePhoto: { color: colors.primary, textAlign: 'center', marginBottom: spacing.md, fontWeight: '600' },
});
