import React, { useState } from 'react';
import { errorText } from '../../lib/errors';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import { askImageSource, pickImage } from '../../lib/pickImage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { publishPost } from '../../lib/posts';
import { parseYear } from '../../lib/portfolio';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STRINGS = {
  ru: {
    photoTitle: 'Фото работы',
    choosePhoto: 'Выберите фото работы',
    checkYear: 'Проверьте год',
    yearHint: 'Укажите год четырьмя цифрами, например 2026.',
    publishFailed: 'Не удалось опубликовать работу',
    error: 'Ошибка',
    heading: 'Поделиться работой',
    tapToPick: 'Нажмите, чтобы снять или выбрать фото',
    otherPhoto: 'Выбрать другое фото',
    titleLabel: 'Название',
    titlePlaceholder: 'Например: «Осенний этюд»',
    technique: 'Техника и материалы',
    techniquePlaceholder: 'Акварель, бумага',
    year: 'Год',
    caption: 'Подпись',
    captionPlaceholder: 'Расскажите о своей работе…',
    publish: 'Опубликовать',
  },
  kk: {
    photoTitle: 'Жұмыстың фотосы',
    choosePhoto: 'Жұмыстың фотосын таңдаңыз',
    checkYear: 'Жылды тексеріңіз',
    yearHint: 'Жылды төрт цифрмен көрсетіңіз, мысалы 2026.',
    publishFailed: 'Жұмысты жариялау мүмкін болмады',
    error: 'Қате',
    heading: 'Жұмыспен бөлісу',
    tapToPick: 'Фото түсіру немесе таңдау үшін басыңыз',
    otherPhoto: 'Басқа фото таңдау',
    titleLabel: 'Атауы',
    titlePlaceholder: 'Мысалы: «Күзгі этюд»',
    technique: 'Техника және материалдар',
    techniquePlaceholder: 'Акварель, қағаз',
    year: 'Жылы',
    caption: 'Сипаттама',
    captionPlaceholder: 'Жұмысыңыз туралы айтып беріңіз…',
    publish: 'Жариялау',
  },
  en: {
    photoTitle: 'Artwork photo',
    choosePhoto: 'Choose a photo of your artwork',
    checkYear: 'Check the year',
    yearHint: 'Enter the year as four digits, e.g. 2026.',
    publishFailed: 'Could not publish the artwork',
    error: 'Error',
    heading: 'Share your work',
    tapToPick: 'Tap to take or choose a photo',
    otherPhoto: 'Choose another photo',
    titleLabel: 'Title',
    titlePlaceholder: 'E.g. “Autumn study”',
    technique: 'Technique and materials',
    techniquePlaceholder: 'Watercolor, paper',
    year: 'Year',
    caption: 'Caption',
    captionPlaceholder: 'Tell us about your work…',
    publish: 'Publish',
  },
};

export function CreatePostScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [technique, setTechnique] = useState('');
  const [year, setYear] = useState('');
  const [uploading, setUploading] = useState(false);

  const choosePhoto = async () => {
    const source = await askImageSource(s.photoTitle);
    if (!source) return;
    const picked = await pickImage(source);
    if (picked) setAsset(picked);
  };

  const onPublish = async () => {
    if (!profile) return;
    if (!asset) {
      Alert.alert(s.choosePhoto);
      return;
    }
    const artworkYear = parseYear(year);
    if (artworkYear === 'invalid') {
      Alert.alert(s.checkYear, s.yearHint);
      return;
    }
    setUploading(true);
    try {
      await publishPost({ authorId: profile.id, asset, caption, title, technique, artworkYear });
      navigation.goBack();
    } catch (e) {
      const message = errorText(e) ?? s.publishFailed;
      Alert.alert(s.error, message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{s.heading}</Text>

      <View style={styles.imagePicker}>
        {asset ? (
          <Image source={{ uri: asset.uri }} style={styles.preview} />
        ) : (
          <Text onPress={choosePhoto} style={styles.pickText}>
            {s.tapToPick}
          </Text>
        )}
      </View>
      {asset ? (
        <Text onPress={choosePhoto} style={styles.changePhoto}>
          {s.otherPhoto}
        </Text>
      ) : null}

      <TextField label={s.titleLabel} placeholder={s.titlePlaceholder} value={title} onChangeText={setTitle} />
      <View style={styles.row}>
        <View style={styles.rowWide}>
          <TextField
            label={s.technique}
            placeholder={s.techniquePlaceholder}
            value={technique}
            onChangeText={setTechnique}
          />
        </View>
        <View style={styles.rowNarrow}>
          <TextField
            label={s.year}
            placeholder={String(new Date().getFullYear())}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      <TextField
        label={s.caption}
        placeholder={s.captionPlaceholder}
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <Button title={s.publish} onPress={onPublish} loading={uploading} />
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
