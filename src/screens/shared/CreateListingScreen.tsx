import React, { useState } from 'react';
import { errorText } from '../../lib/errors';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STRINGS = {
  ru: {
    needGallery: 'Нужен доступ к галерее, чтобы выбрать фото работы',
    choosePhoto: 'Выберите фото работы',
    needTitle: 'Укажите название работы',
    needPrice: 'Укажите корректную цену',
    done: 'Готово',
    sentForReview: 'Объявление отправлено на проверку администрации школы',
    publishFailed: 'Не удалось опубликовать объявление',
    error: 'Ошибка',
    heading: 'Разместить работу на продажу',
    hint: 'Объявление пройдёт проверку администрации школы, после чего работу можно будет разместить на kasteyevshop.kz',
    tapToPick: 'Нажмите, чтобы выбрать фото',
    otherPhoto: 'Выбрать другое фото',
    titleLabel: 'Название работы',
    titlePlaceholder: 'Например: Натюрморт с яблоками',
    description: 'Описание',
    descriptionPlaceholder: 'Техника, размер, год создания…',
    price: 'Цена (₸)',
    contacts: 'Контакты для связи',
    contactsPlaceholder: 'Телефон, WhatsApp или Telegram',
    submit: 'Отправить на проверку',
  },
  kk: {
    needGallery: 'Жұмыстың фотосын таңдау үшін галереяға рұқсат қажет',
    choosePhoto: 'Жұмыстың фотосын таңдаңыз',
    needTitle: 'Жұмыстың атауын көрсетіңіз',
    needPrice: 'Дұрыс бағаны көрсетіңіз',
    done: 'Дайын',
    sentForReview: 'Хабарландыру мектеп әкімшілігіне тексеруге жіберілді',
    publishFailed: 'Хабарландыруды жариялау мүмкін болмады',
    error: 'Қате',
    heading: 'Жұмысты сатылымға қою',
    hint: 'Хабарландыруды мектеп әкімшілігі тексереді, содан кейін жұмысты kasteyevshop.kz сайтына орналастыруға болады',
    tapToPick: 'Фото таңдау үшін басыңыз',
    otherPhoto: 'Басқа фото таңдау',
    titleLabel: 'Жұмыстың атауы',
    titlePlaceholder: 'Мысалы: Алмалы натюрморт',
    description: 'Сипаттама',
    descriptionPlaceholder: 'Техника, өлшемі, жасалған жылы…',
    price: 'Бағасы (₸)',
    contacts: 'Байланыс деректері',
    contactsPlaceholder: 'Телефон, WhatsApp немесе Telegram',
    submit: 'Тексеруге жіберу',
  },
  en: {
    needGallery: 'Gallery access is needed to choose a photo of your work',
    choosePhoto: 'Choose a photo of your artwork',
    needTitle: 'Enter the title of the work',
    needPrice: 'Enter a valid price',
    done: 'Done',
    sentForReview: 'Your listing has been sent to the school administration for review',
    publishFailed: 'Could not publish the listing',
    error: 'Error',
    heading: 'Put a work up for sale',
    hint: 'The school administration will review the listing, after which the work can be placed on kasteyevshop.kz',
    tapToPick: 'Tap to choose a photo',
    otherPhoto: 'Choose another photo',
    titleLabel: 'Title of the work',
    titlePlaceholder: 'E.g. Still life with apples',
    description: 'Description',
    descriptionPlaceholder: 'Technique, size, year created…',
    price: 'Price (₸)',
    contacts: 'Contact details',
    contactsPlaceholder: 'Phone, WhatsApp or Telegram',
    submit: 'Submit for review',
  },
};

export function CreateListingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [uploading, setUploading] = useState(false);

  // Телефон не подставляется сам: объявление видят все, контакт автор указывает осознанно.

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(s.needGallery);
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
      Alert.alert(s.choosePhoto);
      return;
    }
    if (!title.trim()) {
      Alert.alert(s.needTitle);
      return;
    }
    const priceNumber = Number(price.trim().replace(',', '.'));
    if (!price.trim() || Number.isNaN(priceNumber) || priceNumber <= 0) {
      Alert.alert(s.needPrice);
      return;
    }

    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('marketplace')
        .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('marketplace').getPublicUrl(path);

      const { data: listing, error: listingError } = await supabase
        .from('marketplace_listings')
        .insert({
          seller_id: profile.id,
          title: title.trim(),
          description: description.trim() || null,
          price: priceNumber,
          contact_info: contactInfo.trim() || null,
        })
        .select()
        .single();
      if (listingError) throw listingError;

      const { error: imageError } = await supabase
        .from('marketplace_listing_images')
        .insert({ listing_id: listing.id, image_url: publicUrlData.publicUrl, position: 0 });
      if (imageError) throw imageError;

      Alert.alert(s.done, s.sentForReview);
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
      <Text style={styles.hint}>{s.hint}</Text>

      <View style={styles.imagePicker}>
        {asset ? (
          <Image source={{ uri: asset.uri }} style={styles.preview} />
        ) : (
          <Text onPress={pickImage} style={styles.pickText}>
            {s.tapToPick}
          </Text>
        )}
      </View>
      {asset ? (
        <Text onPress={pickImage} style={styles.changePhoto}>
          {s.otherPhoto}
        </Text>
      ) : null}

      <TextField label={s.titleLabel} value={title} onChangeText={setTitle} placeholder={s.titlePlaceholder} />
      <TextField
        label={s.description}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder={s.descriptionPlaceholder}
      />
      <TextField label={s.price} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="50000" />
      <TextField
        label={s.contacts}
        value={contactInfo}
        onChangeText={setContactInfo}
        placeholder={s.contactsPlaceholder}
      />

      <Button title={s.submit} onPress={onPublish} loading={uploading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  hint: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 },
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
  changePhoto: { color: colors.primary, textAlign: 'center', marginBottom: spacing.md, fontWeight: '600' },
});
