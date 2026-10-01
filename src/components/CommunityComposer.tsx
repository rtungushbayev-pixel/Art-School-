import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button } from './Button';
import { pickImage, type ImageSource } from '../lib/pickImage';
import { publishPost } from '../lib/posts';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';

interface Props {
  authorId: string;
  onPublished: () => void;
}

const STRINGS = {
  ru: {
    sent: 'Отправлено',
    sentMessage: 'Публикация появится в Комьюнити после проверки. Пока её видно в «Мои публикации».',
    publishFailed: 'Не удалось опубликовать',
    removePhoto: 'Убрать фото',
    gallery: 'Галерея',
    camera: 'Камера',
    placeholder: 'Поделиться впечатлениями...',
    publish: 'Опубликовать',
  },
  kk: {
    sent: 'Жіберілді',
    sentMessage: 'Жарияланым тексерілгеннен кейін Қауымдастықта пайда болады. Әзірге оны «Менің жарияланымдарым» бөлімінен көруге болады.',
    publishFailed: 'Жариялау мүмкін болмады',
    removePhoto: 'Фотоны алып тастау',
    gallery: 'Галерея',
    camera: 'Камера',
    placeholder: 'Әсерлеріңізбен бөлісіңіз...',
    publish: 'Жариялау',
  },
  en: {
    sent: 'Sent',
    sentMessage: 'Your post will appear in the Community after review. For now you can see it in “My posts”.',
    publishFailed: 'Could not publish',
    removePhoto: 'Remove photo',
    gallery: 'Gallery',
    camera: 'Camera',
    placeholder: 'Share your impressions...',
    publish: 'Publish',
  },
};

// Быстрая публикация в «Комьюнити»: снять или выбрать фото и написать пару
// слов. Название и технику работы можно добавить потом в «О работе».
export function CommunityComposer({ authorId, onPublished }: Props) {
  const s = useStrings(STRINGS);
  const [asset, setAsset] = useState<ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  const choose = async (source: ImageSource) => {
    const picked = await pickImage(source);
    if (picked) setAsset(picked);
  };

  const onPublish = async () => {
    if (!asset) return;
    setPublishing(true);
    try {
      await publishPost({ authorId, asset, caption });
      setAsset(null);
      setCaption('');
      Alert.alert(s.sent, s.sentMessage);
      onPublished();
    } catch (e) {
      Alert.alert(s.publishFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.card}>
      {asset ? (
        <View>
          <Image source={{ uri: asset.uri }} style={styles.preview} contentFit="cover" />
          <Pressable style={styles.remove} onPress={() => setAsset(null)} hitSlop={8} accessibilityLabel={s.removePhoto}>
            <Ionicons name="close" size={18} color={colors.white} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sources}>
        <Pressable style={styles.source} onPress={() => choose('library')}>
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={styles.sourceText}>{s.gallery}</Text>
        </Pressable>
        <Pressable style={styles.source} onPress={() => choose('camera')}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={styles.sourceText}>{s.camera}</Text>
        </Pressable>
      </View>

      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder={s.placeholder}
        placeholderTextColor="rgba(34, 28, 26, 0.45)"
        multiline
        style={styles.input}
      />

      {asset ? <Button title={s.publish} onPress={onPublish} loading={publishing} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  preview: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
  remove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sources: { flexDirection: 'row', gap: spacing.sm },
  source: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  sourceText: { color: colors.primary, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
