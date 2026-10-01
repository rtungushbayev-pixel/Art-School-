import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { SUPPORT_CATEGORY_LABELS, createSupportTicket } from '../../lib/support';
import { colors, radius, spacing } from '../../theme/colors';
import type { SupportCategory } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const CATEGORIES: { value: SupportCategory; hint: string }[] = [
  { value: 'bug', hint: 'Что-то не работает, приложение зависает или показывает ошибку' },
  { value: 'question', hint: 'Расписание, оплата, группы, доступ к аккаунту' },
  { value: 'other', hint: 'Предложение или любой другой вопрос' },
];

export function NewSupportTicketScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const onSend = async () => {
    if (!category) {
      Alert.alert('Выберите причину обращения');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      Alert.alert('Заполните тему и описание');
      return;
    }
    setSaving(true);
    try {
      const ticketId = await createSupportTicket(category, subject.trim(), body.trim());
      // Заменяем форму окном переписки, чтобы «Назад» вело к списку обращений.
      navigation.replace('SupportTicket', { ticketId });
    } catch (e) {
      setSaving(false);
      Alert.alert('Не удалось отправить', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.label}>Причина обращения</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((opt) => {
          const active = category === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setCategory(opt.value)}
              style={[styles.category, active && styles.categoryActive]}
            >
              <Text style={[styles.categoryTitle, active && styles.categoryTextActive]}>
                {SUPPORT_CATEGORY_LABELS[opt.value]}
              </Text>
              <Text style={[styles.categoryHint, active && styles.categoryTextActive]}>{opt.hint}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextField label="Тема" value={subject} onChangeText={setSubject} maxLength={200} />
      <TextField
        label="Опишите подробно"
        placeholder={category === 'bug' ? 'Что вы делали, что ожидали и что произошло' : undefined}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        maxLength={4000}
        style={styles.textarea}
      />

      <Button title="Отправить" onPress={onSend} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  categories: { gap: spacing.sm, marginBottom: spacing.md },
  category: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryTitle: { fontWeight: '700', color: colors.text },
  categoryHint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  categoryTextActive: { color: colors.white },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
});
