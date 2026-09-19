import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { EnrollmentStatus } from '../../types/database';

const STATUS_OPTIONS: { value: EnrollmentStatus; label: string }[] = [
  { value: 'planning', label: 'Планирую' },
  { value: 'applied', label: 'Подал(а) документы' },
  { value: 'enrolled', label: 'Поступил(а)' },
];

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [targetInstitution, setTargetInstitution] = useState(profile?.target_institution ?? '');
  const [status, setStatus] = useState<EnrollmentStatus | null>(profile?.target_institution_status ?? null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!profile) return null;

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ к галерее');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/avatar.${ext}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch (e) {
      Alert.alert('Не удалось загрузить фото', e instanceof Error ? e.message : undefined);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        target_institution: targetInstitution.trim() || null,
        target_institution_status: targetInstitution.trim() ? status : null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось сохранить', error.message);
      return;
    }
    await refreshProfile();
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
        <Avatar uri={avatarUrl} name={fullName} size={96} />
        <Text style={styles.avatarHint}>{uploadingAvatar ? 'Загрузка…' : 'Изменить фото'}</Text>
      </Pressable>

      <TextField label="Имя" value={fullName} onChangeText={setFullName} />
      <TextField label="О себе" value={bio} onChangeText={setBio} multiline />

      <Text style={styles.sectionLabel}>Куда поступил(а) / планирую поступать</Text>
      <TextField
        placeholder="Например: КазНАИ им. Т. Жургенова"
        value={targetInstitution}
        onChangeText={setTargetInstitution}
      />

      {targetInstitution.trim() ? (
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setStatus(opt.value)}
              style={[styles.statusOption, status === opt.value && styles.statusOptionActive]}
            >
              <Text style={[styles.statusText, status === opt.value && styles.statusTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Button title="Сохранить" onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrapper: { alignItems: 'center', marginBottom: spacing.lg },
  avatarHint: { color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
  sectionLabel: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  statusTextActive: { color: colors.white },
});
