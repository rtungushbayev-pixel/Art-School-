import React, { useState } from 'react';
import { errorText } from '../lib/errors';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button } from './Button';
import { pickImage, pickImagesFromLibrary } from '../lib/pickImage';
import { MAX_POST_PHOTOS, publishPost, requestAiModeration } from '../lib/posts';
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
    published: 'Опубликовано',
    publishedMessage: 'Публикация уже в Комьюнити.',
    rejectedTitle: 'Публикация не прошла проверку',
    rejectedMessage: 'Причина — в «Мои публикации». Если считаете, что это ошибка, напишите в «Помощь».',
    publishFailed: 'Не удалось опубликовать',
    removePhoto: 'Убрать фото',
    gallery: 'Галерея',
    camera: 'Камера',
    placeholder: 'Поделиться впечатлениями...',
    publish: 'Опубликовать',
    photosCount: (n: number) => `${n} из ${MAX_POST_PHOTOS} фото`,
    limitReached: `Можно приложить не больше ${MAX_POST_PHOTOS} фото`,
  },
  kk: {
    sent: 'Жіберілді',
    sentMessage: 'Жарияланым тексерілгеннен кейін Қауымдастықта пайда болады. Әзірге оны «Менің жарияланымдарым» бөлімінен көруге болады.',
    published: 'Жарияланды',
    publishedMessage: 'Жарияланым Қауымдастықта.',
    rejectedTitle: 'Жарияланым тексеруден өтпеді',
    rejectedMessage: 'Себебі «Менің жарияланымдарым» бөлімінде. Қате деп ойласаңыз, «Көмек» бөліміне жазыңыз.',
    publishFailed: 'Жариялау мүмкін болмады',
    removePhoto: 'Фотоны алып тастау',
    gallery: 'Галерея',
    camera: 'Камера',
    placeholder: 'Әсерлеріңізбен бөлісіңіз...',
    publish: 'Жариялау',
    photosCount: (n: number) => `${MAX_POST_PHOTOS} фотоның ${n}`,
    limitReached: `${MAX_POST_PHOTOS} фотодан артық қосуға болмайды`,
  },
  en: {
    sent: 'Sent',
    sentMessage: 'Your post will appear in the Community after review. For now you can see it in “My posts”.',
    published: 'Published',
    publishedMessage: 'Your post is now in the Community.',
    rejectedTitle: 'Your post did not pass review',
    rejectedMessage: 'See the reason in “My posts”. If you think this is a mistake, write to Help.',
    publishFailed: 'Could not publish',
    removePhoto: 'Remove photo',
    gallery: 'Gallery',
    camera: 'Camera',
    placeholder: 'Share your impressions...',
    publish: 'Publish',
    photosCount: (n: number) => `${n} of ${MAX_POST_PHOTOS} photos`,
    limitReached: `You can attach up to ${MAX_POST_PHOTOS} photos`,
  },
};

// Быстрая публикация в «Комьюнити»: снять или выбрать фото и написать пару
// слов. Название и технику работы можно добавить потом в «О работе».
export function CommunityComposer({ authorId, onPublished }: Props) {
  const s = useStrings(STRINGS);
  const [assets, setAssets] = useState<ImagePickerAsset[]>([]);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  const left = MAX_POST_PHOTOS - assets.length;

  // Галерея — сразу несколько фото, камера — по одному снимку.
  const addFromLibrary = async () => {
    if (left <= 0) return Alert.alert(s.limitReached);
    const picked = await pickImagesFromLibrary(left);
    if (picked.length) setAssets((prev) => [...prev, ...picked].slice(0, MAX_POST_PHOTOS));
  };

  const addFromCamera = async () => {
    if (left <= 0) return Alert.alert(s.limitReached);
    const picked = await pickImage('camera');
    if (picked) setAssets((prev) => [...prev, picked].slice(0, MAX_POST_PHOTOS));
  };

  const removeAt = (index: number) => setAssets((prev) => prev.filter((_, i) => i !== index));

  const onPublish = async () => {
    if (assets.length === 0) return;
    setPublishing(true);
    try {
      const postId = await publishPost({ authorId, assets, caption });
      setAssets([]);
      setCaption('');
      // Автоматическая проверка: обычно занимает несколько секунд.
      const decision = await requestAiModeration(postId);
      if (decision === 'approve') Alert.alert(s.published, s.publishedMessage);
      else if (decision === 'reject') Alert.alert(s.rejectedTitle, s.rejectedMessage);
      else Alert.alert(s.sent, s.sentMessage);
      onPublished();
    } catch (e) {
      Alert.alert(s.publishFailed, errorText(e));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.card}>
      {assets.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {assets.map((a, i) => (
              <View key={`${a.uri}-${i}`}>
                <Image source={{ uri: a.uri }} style={styles.thumb} contentFit="cover" />
                <Pressable style={styles.remove} onPress={() => removeAt(i)} hitSlop={8} accessibilityLabel={s.removePhoto}>
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.count}>{s.photosCount(assets.length)}</Text>
        </>
      ) : null}

      <View style={styles.sources}>
        <Pressable style={styles.source} onPress={addFromLibrary}>
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={styles.sourceText}>{s.gallery}</Text>
        </Pressable>
        <Pressable style={styles.source} onPress={addFromCamera}>
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

      {assets.length > 0 ? <Button title={s.publish} onPress={onPublish} loading={publishing} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbs: { gap: spacing.sm },
  thumb: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.border },
  count: { color: colors.textMuted, fontSize: 12 },
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
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
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
