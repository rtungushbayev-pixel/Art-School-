import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function CreateListingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [contactInfo, setContactInfo] = useState(profile?.phone ?? '');
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
    if (!title.trim()) {
      Alert.alert('Укажите название работы');
      return;
    }
    const priceNumber = Number(price.trim().replace(',', '.'));
    if (!price.trim() || Number.isNaN(priceNumber) || priceNumber <= 0) {
      Alert.alert('Укажите корректную цену');
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

      Alert.alert('Готово', 'Объявление отправлено на проверку администрации школы');
      navigation.goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось опубликовать объявление';
      Alert.alert('Ошибка', message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Разместить работу на продажу</Text>
      <Text style={styles.hint}>
        Объявление пройдёт проверку администрации школы, после чего работу можно будет разместить на
        kasteyevshop.kz
      </Text>

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

      <TextField label="Название работы" value={title} onChangeText={setTitle} placeholder="Например: Натюрморт с яблоками" />
      <TextField
        label="Описание"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Техника, размер, год создания…"
      />
      <TextField label="Цена (₸)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="50000" />
      <TextField
        label="Контакты для связи"
        value={contactInfo}
        onChangeText={setContactInfo}
        placeholder="Телефон, WhatsApp или Telegram"
      />

      <Button title="Отправить на проверку" onPress={onPublish} loading={uploading} />
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
