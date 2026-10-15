import React, { useEffect, useState } from 'react';
import { isStaffRole } from '../../lib/roles';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { formatEventDate } from '../../components/AchievementList';
import {
  ACHIEVEMENT_KIND_LABELS,
  achievementKindLabels,
  deleteAchievement,
  fetchAchievement,
  saveAchievement,
} from '../../lib/portfolio';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage, useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { AchievementKind, StudentAchievement } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const KINDS = Object.keys(ACHIEVEMENT_KIND_LABELS) as AchievementKind[];

const STRINGS = {
  ru: {
    needTitle: 'Укажите название',
    needTitleHint: 'Например: городской конкурс детского рисунка.',
    checkDate: 'Проверьте дату',
    dateHint: 'Дата в формате ДД.ММ.ГГГГ, например 15.05.2026.',
    saveFailed: 'Не удалось сохранить',
    deleteQ: 'Удалить достижение?',
    cancel: 'Отмена',
    delete: 'Удалить',
    deleteFailed: 'Не удалось удалить',
    type: 'Тип',
    titleLabel: 'Название',
    titlePlaceholder: 'Например: Республиканский конкурс «Юный художник»',
    result: 'Результат',
    resultPlaceholder: '1 место, Гран-при, участник…',
    date: 'Дата',
    datePlaceholder: 'ДД.ММ.ГГГГ',
    verified: 'Подтверждено школой',
    verifiedHint: 'Ученик увидит отметку в профиле',
    verifiedWarning:
      'Достижение подтверждено школой. После изменения отметка снимется, пока сотрудник не проверит его снова.',
    save: 'Сохранить',
  },
  kk: {
    needTitle: 'Атауын көрсетіңіз',
    needTitleHint: 'Мысалы: балалар суретінің қалалық байқауы.',
    checkDate: 'Күнді тексеріңіз',
    dateHint: 'Күн КК.АА.ЖЖЖЖ пішімінде, мысалы 15.05.2026.',
    saveFailed: 'Сақтау мүмкін болмады',
    deleteQ: 'Жетістікті жою керек пе?',
    cancel: 'Бас тарту',
    delete: 'Жою',
    deleteFailed: 'Жою мүмкін болмады',
    type: 'Түрі',
    titleLabel: 'Атауы',
    titlePlaceholder: 'Мысалы: «Жас суретші» республикалық байқауы',
    result: 'Нәтиже',
    resultPlaceholder: '1-орын, Гран-при, қатысушы…',
    date: 'Күні',
    datePlaceholder: 'КК.АА.ЖЖЖЖ',
    verified: 'Мектеп растаған',
    verifiedHint: 'Оқушы белгіні профилінде көреді',
    verifiedWarning:
      'Жетістікті мектеп растаған. Өзгерткеннен кейін қызметкер қайта тексергенше белгі алынып тасталады.',
    save: 'Сақтау',
  },
  en: {
    needTitle: 'Enter a title',
    needTitleHint: 'E.g. City children’s drawing competition.',
    checkDate: 'Check the date',
    dateHint: 'Use the DD.MM.YYYY format, e.g. 15.05.2026.',
    saveFailed: 'Could not save',
    deleteQ: 'Delete this achievement?',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteFailed: 'Could not delete',
    type: 'Type',
    titleLabel: 'Title',
    titlePlaceholder: 'E.g. National competition “Young Artist”',
    result: 'Result',
    resultPlaceholder: '1st place, Grand Prix, participant…',
    date: 'Date',
    datePlaceholder: 'DD.MM.YYYY',
    verified: 'Verified by the school',
    verifiedHint: 'The student will see the mark in their profile',
    verifiedWarning:
      'This achievement is verified by the school. After you edit it, the mark will be removed until a staff member checks it again.',
    save: 'Save',
  },
};

// «ДД.ММ.ГГГГ» → «ГГГГ-ММ-ДД»; пусто → null; неверная дата → 'invalid'
function parseDate(value: string): string | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
  if (!match) return 'invalid';
  const [, d, m, y] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) {
    return 'invalid';
  }
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function EditAchievementScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<NavParamList, 'EditAchievement'>>();
  const { studentId, achievementId } = route.params;
  const { profile: viewer } = useAuth();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const kindLabels = achievementKindLabels(lang);
  const isStaff = isStaffRole(viewer?.role);

  const [existing, setExisting] = useState<StudentAchievement | null>(null);
  const [kind, setKind] = useState<AchievementKind>('competition');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState('');
  const [date, setDate] = useState('');
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!achievementId) return;
    fetchAchievement(achievementId)
      .then((row) => {
        if (!row) return;
        setExisting(row);
        setKind(row.kind);
        setTitle(row.title);
        setResult(row.result ?? '');
        setDate(formatEventDate(row.event_date) ?? '');
        setVerified(row.verified);
      })
      .catch(() => {});
  }, [achievementId]);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert(s.needTitle, s.needTitleHint);
      return;
    }
    const eventDate = parseDate(date);
    if (eventDate === 'invalid') {
      Alert.alert(s.checkDate, s.dateHint);
      return;
    }
    setSaving(true);
    try {
      await saveAchievement(
        studentId,
        {
          kind,
          title: title.trim(),
          result: result.trim() || null,
          event_date: eventDate,
          // Отметку меняет только сотрудник; для ученика её сбросит база
          ...(isStaff ? { verified } : {}),
        },
        achievementId
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert(s.saveFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!achievementId) return;
    Alert.alert(s.deleteQ, undefined, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAchievement(achievementId);
            navigation.goBack();
          } catch (e) {
            Alert.alert(s.deleteFailed, e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.label}>{s.type}</Text>
      <View style={styles.kindRow}>
        {KINDS.map((value) => (
          <Pressable
            key={value}
            onPress={() => setKind(value)}
            style={[styles.kindOption, kind === value && styles.kindOptionActive]}
          >
            <Text style={[styles.kindText, kind === value && styles.kindTextActive]}>
              {kindLabels[value]}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextField
        label={s.titleLabel}
        placeholder={s.titlePlaceholder}
        value={title}
        onChangeText={setTitle}
      />
      <TextField label={s.result} placeholder={s.resultPlaceholder} value={result} onChangeText={setResult} />
      <TextField
        label={s.date}
        placeholder={s.datePlaceholder}
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />

      {isStaff ? (
        <Card style={styles.verifyRow}>
          <View style={styles.verifyText}>
            <Text style={styles.verifyTitle}>{s.verified}</Text>
            <Text style={styles.muted}>{s.verifiedHint}</Text>
          </View>
          <Switch
            value={verified}
            onValueChange={setVerified}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={verified ? colors.primary : colors.white}
            ios_backgroundColor={colors.border}
          />
        </Card>
      ) : existing?.verified ? (
        <Text style={styles.warning}>{s.verifiedWarning}</Text>
      ) : null}

      <Button title={s.save} onPress={onSave} loading={saving} />
      {achievementId ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title={s.delete} variant="danger" onPress={onDelete} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  kindOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  kindOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  kindTextActive: { color: colors.white },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  verifyText: { flex: 1 },
  verifyTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  warning: { color: colors.warning, marginBottom: spacing.md },
});
