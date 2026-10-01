import React, { useEffect, useState } from 'react';
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
  deleteAchievement,
  fetchAchievement,
  saveAchievement,
} from '../../lib/portfolio';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { AchievementKind, StudentAchievement } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const KINDS = Object.keys(ACHIEVEMENT_KIND_LABELS) as AchievementKind[];

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
  const isStaff = viewer?.role === 'staff';

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
      Alert.alert('Укажите название', 'Например: городской конкурс детского рисунка.');
      return;
    }
    const eventDate = parseDate(date);
    if (eventDate === 'invalid') {
      Alert.alert('Проверьте дату', 'Дата в формате ДД.ММ.ГГГГ, например 15.05.2026.');
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
      Alert.alert('Не удалось сохранить', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!achievementId) return;
    Alert.alert('Удалить достижение?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAchievement(achievementId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Не удалось удалить', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.label}>Тип</Text>
      <View style={styles.kindRow}>
        {KINDS.map((value) => (
          <Pressable
            key={value}
            onPress={() => setKind(value)}
            style={[styles.kindOption, kind === value && styles.kindOptionActive]}
          >
            <Text style={[styles.kindText, kind === value && styles.kindTextActive]}>
              {ACHIEVEMENT_KIND_LABELS[value]}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextField
        label="Название"
        placeholder="Например: Республиканский конкурс «Юный художник»"
        value={title}
        onChangeText={setTitle}
      />
      <TextField label="Результат" placeholder="1 место, Гран-при, участник…" value={result} onChangeText={setResult} />
      <TextField
        label="Дата"
        placeholder="ДД.ММ.ГГГГ"
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />

      {isStaff ? (
        <Card style={styles.verifyRow}>
          <View style={styles.verifyText}>
            <Text style={styles.verifyTitle}>Подтверждено школой</Text>
            <Text style={styles.muted}>Ученик увидит отметку в профиле</Text>
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
        <Text style={styles.warning}>
          Достижение подтверждено школой. После изменения отметка снимется, пока сотрудник не проверит
          его снова.
        </Text>
      ) : null}

      <Button title="Сохранить" onPress={onSave} loading={saving} />
      {achievementId ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title="Удалить" variant="danger" onPress={onDelete} />
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
