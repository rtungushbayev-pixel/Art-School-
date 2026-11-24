import React, { useState } from 'react';
import { errorText } from '../../lib/errors';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import { askImageSource, pickImage } from '../../lib/pickImage';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { publishPost, requestAiModeration } from '../../lib/posts';
import { parseYear } from '../../lib/portfolio';
import { XP_WEEKLY, fetchHeroXp, schoolWeek, weeklyTheme } from '../../lib/weeklyDrawing';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage, useStrings } from '../../i18n';
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
    dailyKicker: 'Рисунок недели',
    dailyDone: 'Рисунок недели готов!',
    dailyReward: (xp: number, streak: number) =>
      `Твой герой получил +${xp} опыта.${streak > 1 ? ` Огонёк горит ${streak} нед. подряд!` : ' В понедельник будет новая тема.'}`,
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
    dailyKicker: 'Апта суреті',
    dailyDone: 'Апта суреті дайын!',
    dailyReward: (xp: number, streak: number) =>
      `Кейіпкерің +${xp} тәжірибе алды.${streak > 1 ? ` Отың ${streak} апта қатарынан жанып тұр!` : ' Дүйсенбіде жаңа тақырып болады.'}`,
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
    dailyKicker: 'Drawing of the week',
    dailyDone: 'Drawing of the week is done!',
    dailyReward: (xp: number, streak: number) =>
      `Your hero got +${xp} XP.${streak > 1 ? ` Your streak is ${streak} weeks in a row!` : ' A new theme comes on Monday.'}`,
  },
};

export function CreatePostScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'CreatePost'>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  // «Рисунок недели»: тема на эту неделю, работа засчитывается герою.
  const daily = !!route.params?.weekly && profile?.role === 'student';
  const week = schoolWeek().monday;
  const theme = daily ? weeklyTheme(week, lang) : null;
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
      const postId = await publishPost({
        authorId: profile.id,
        assets: [asset],
        caption,
        title: title.trim() || theme?.title || '',
        technique,
        artworkYear,
        weeklyThemeWeek: daily ? week : null,
      });
      // Проверка идёт в фоне; результат будет виден в «Мои публикации».
      requestAiModeration(postId);
      if (daily) {
        const xp = await fetchHeroXp(profile.id).catch(() => null);
        Alert.alert(s.dailyDone, s.dailyReward(XP_WEEKLY, xp?.streak ?? 1));
      }
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
      {theme ? (
        <View style={styles.daily}>
          <Ionicons name="color-palette" size={22} color={colors.white} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyKicker}>{s.dailyKicker}</Text>
            <Text style={styles.dailyTitle}>{theme.title}</Text>
            <Text style={styles.dailyHint}>{theme.hint}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>{s.heading}</Text>
      )}

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

      <TextField label={s.titleLabel} placeholder={theme?.title ?? s.titlePlaceholder} value={title} onChangeText={setTitle} />
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
  daily: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#4A2F91',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dailyKicker: { color: '#FBB31F', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  dailyTitle: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: 2 },
  dailyHint: { color: '#E3DAF7', fontSize: 13, marginTop: 2 },
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
