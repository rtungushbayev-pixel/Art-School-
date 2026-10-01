import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { supabase } from '../../lib/supabase';
import { pickAndUploadAvatar } from '../../lib/avatar';
import { parseYear } from '../../lib/portfolio';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { EnrollmentStatus } from '../../types/database';

const STATUS_VALUES: EnrollmentStatus[] = ['planning', 'applied', 'enrolled'];

const STRINGS = {
  ru: {
    status: {
      planning: 'Планирую',
      applied: 'Подал(а) документы',
      enrolled: 'Поступил(а)',
    } as Record<EnrollmentStatus, string>,
    avatarFailed: 'Не удалось загрузить фото',
    checkYear: 'Проверьте год',
    yearHint: 'Укажите год четырьмя цифрами, например 2023.',
    saveFailed: 'Не удалось сохранить',
    loading: 'Загрузка…',
    changePhoto: 'Изменить фото',
    name: 'Имя',
    bio: 'О себе',
    specialization: 'Направление',
    specializationPlaceholder: 'Живопись, графика, дизайн…',
    studySince: 'Учусь с',
    institution: 'Куда поступил(а) / планирую поступать',
    institutionPlaceholder: 'Например: КазНАИ им. Т. Жургенова',
    save: 'Сохранить',
  },
  kk: {
    status: {
      planning: 'Жоспарлап жүрмін',
      applied: 'Құжат тапсырдым',
      enrolled: 'Түстім',
    } as Record<EnrollmentStatus, string>,
    avatarFailed: 'Фотоны жүктеу мүмкін болмады',
    checkYear: 'Жылды тексеріңіз',
    yearHint: 'Жылды төрт цифрмен көрсетіңіз, мысалы 2023.',
    saveFailed: 'Сақтау мүмкін болмады',
    loading: 'Жүктелуде…',
    changePhoto: 'Фотоны өзгерту',
    name: 'Аты',
    bio: 'Өзім туралы',
    specialization: 'Бағыты',
    specializationPlaceholder: 'Кескіндеме, графика, дизайн…',
    studySince: 'Оқып жүрген жылым',
    institution: 'Қайда түстім / түсуді жоспарлап жүрмін',
    institutionPlaceholder: 'Мысалы: Т. Жүргенов атындағы ҚазҰӨА',
    save: 'Сақтау',
  },
  en: {
    status: {
      planning: 'Planning',
      applied: 'Applied',
      enrolled: 'Enrolled',
    } as Record<EnrollmentStatus, string>,
    avatarFailed: 'Could not upload the photo',
    checkYear: 'Check the year',
    yearHint: 'Enter the year as four digits, e.g. 2023.',
    saveFailed: 'Could not save',
    loading: 'Loading…',
    changePhoto: 'Change photo',
    name: 'Name',
    bio: 'About me',
    specialization: 'Field of study',
    specializationPlaceholder: 'Painting, graphics, design…',
    studySince: 'Studying since',
    institution: 'Where I enrolled / plan to apply',
    institutionPlaceholder: 'E.g. Zhurgenov Kazakh National Academy of Arts',
    save: 'Save',
  },
};

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { profile, refreshProfile } = useAuth();
  const s = useStrings(STRINGS);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [targetInstitution, setTargetInstitution] = useState(profile?.target_institution ?? '');
  const [status, setStatus] = useState<EnrollmentStatus | null>(profile?.target_institution_status ?? null);
  const [specialization, setSpecialization] = useState(profile?.specialization ?? '');
  const [studySince, setStudySince] = useState(profile?.study_since ? String(profile.study_since) : '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!profile) return null;

  const pickAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadAvatar(profile.id);
      if (url) setAvatarUrl(url);
    } catch (e) {
      Alert.alert(s.avatarFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isStudent = profile.role === 'student';

  const onSave = async () => {
    const studySinceYear = parseYear(studySince);
    if (studySinceYear === 'invalid') {
      Alert.alert(s.checkYear, s.yearHint);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        target_institution: targetInstitution.trim() || null,
        target_institution_status: targetInstitution.trim() ? status : null,
        specialization: specialization.trim() || null,
        study_since: studySinceYear,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      Alert.alert(s.saveFailed, error.message);
      return;
    }
    await refreshProfile();
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
        <Avatar uri={avatarUrl} name={fullName} size={96} />
        <Text style={styles.avatarHint}>{uploadingAvatar ? s.loading : s.changePhoto}</Text>
      </Pressable>

      <TextField label={s.name} value={fullName} onChangeText={setFullName} />
      <TextField label={s.bio} value={bio} onChangeText={setBio} multiline />

      {isStudent ? (
        <View style={styles.row}>
          <View style={styles.rowWide}>
            <TextField
              label={s.specialization}
              placeholder={s.specializationPlaceholder}
              value={specialization}
              onChangeText={setSpecialization}
            />
          </View>
          <View style={styles.rowNarrow}>
            <TextField
              label={s.studySince}
              placeholder="2023"
              value={studySince}
              onChangeText={setStudySince}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>
      ) : null}

      {isStudent ? (
        <>
      <Text style={styles.sectionLabel}>{s.institution}</Text>
      <TextField
        placeholder={s.institutionPlaceholder}
        value={targetInstitution}
        onChangeText={setTargetInstitution}
      />

      {targetInstitution.trim() ? (
        <View style={styles.statusRow}>
          {STATUS_VALUES.map((value) => (
            <Pressable
              key={value}
              onPress={() => setStatus(value)}
              style={[styles.statusOption, status === value && styles.statusOptionActive]}
            >
              <Text style={[styles.statusText, status === value && styles.statusTextActive]}>{s.status[value]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

        </>
      ) : null}

      <Button title={s.save} onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrapper: { alignItems: 'center', marginBottom: spacing.lg },
  avatarHint: { color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowWide: { flex: 2 },
  rowNarrow: { flex: 1 },
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
