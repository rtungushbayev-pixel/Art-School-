import React, { useState } from 'react';
import { errorText } from '../../lib/errors';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { createSupportTicket, supportCategories, supportCategoryLabel } from '../../lib/support';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { SupportCategory } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STRINGS = {
  ru: {
    describeWhat: 'Опишите, что случилось',
    sendFailed: 'Не удалось отправить',
    title: 'Чем можем помочь?',
    reason: 'Причина обращения',
    details: 'Опишите подробно',
    bugPlaceholder: 'Что вы делали, что ожидали и что произошло',
    subject: 'Тема (необязательно)',
    subjectPlaceholder: 'Коротко, о чём обращение',
    send: 'Отправить',
    change: 'Изменить',
  },
  kk: {
    describeWhat: 'Не болғанын сипаттаңыз',
    sendFailed: 'Жіберу мүмкін болмады',
    title: 'Қалай көмектесе аламыз?',
    reason: 'Өтініш себебі',
    details: 'Толығырақ сипаттаңыз',
    bugPlaceholder: 'Не істедіңіз, нені күттіңіз және не болды',
    subject: 'Тақырып (міндетті емес)',
    subjectPlaceholder: 'Өтініш не туралы, қысқаша',
    send: 'Жіберу',
    change: 'Өзгерту',
  },
  en: {
    describeWhat: 'Please describe what happened',
    sendFailed: 'Could not send',
    title: 'How can we help?',
    reason: 'Reason for your request',
    details: 'Describe in detail',
    bugPlaceholder: 'What you did, what you expected and what happened',
    subject: 'Subject (optional)',
    subjectPlaceholder: 'Briefly, what the request is about',
    send: 'Send',
    change: 'Change',
  },
};

export function NewSupportTicketScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const route = useRoute<RouteProp<NavParamList, 'NewSupportTicket'>>();
  const s = useStrings(STRINGS);
  const [category, setCategory] = useState<SupportCategory>(route.params.category);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  // Тема уже выбрана на прошлом экране — список тем раскрывается только по «Изменить».
  const [picking, setPicking] = useState(false);

  const onSend = async () => {
    if (!body.trim()) {
      Alert.alert(s.describeWhat);
      return;
    }
    setSaving(true);
    try {
      // Тема необязательна: если её нет, берём начало описания.
      const title = subject.trim() || body.trim().split('\n')[0].slice(0, 80);
      const ticketId = await createSupportTicket(category, title, body.trim());
      // Заменяем форму окном переписки, чтобы «Назад» вело к списку обращений.
      navigation.replace('SupportTicket', { ticketId });
    } catch (e) {
      setSaving(false);
      Alert.alert(s.sendFailed, errorText(e));
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.label}>{s.reason}</Text>
      {picking ? (
        <View style={styles.categories}>
          {supportCategories().map((opt) => {
            const active = category === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setCategory(opt.value);
                  setPicking(false);
                }}
                style={[styles.category, active && styles.categoryActive]}
              >
                <Text style={[styles.categoryTitle, active && styles.categoryTextActive]}>
                  {supportCategoryLabel(opt.value)}
                </Text>
                <Text style={[styles.categoryHint, active && styles.categoryTextActive]}>{opt.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={[styles.category, styles.categoryActive, styles.selected]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.categoryTitle, styles.categoryTextActive]}>{supportCategoryLabel(category)}</Text>
            <Text style={[styles.categoryHint, styles.categoryTextActive]}>
              {supportCategories().find((o) => o.value === category)?.hint}
            </Text>
          </View>
          <Text style={styles.change} onPress={() => setPicking(true)}>
            {s.change}
          </Text>
        </View>
      )}

      <TextField
        label={s.details}
        placeholder={category === 'bug' ? s.bugPlaceholder : undefined}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        maxLength={4000}
        style={styles.textarea}
        autoFocus
      />
      <TextField
        label={s.subject}
        placeholder={s.subjectPlaceholder}
        value={subject}
        onChangeText={setSubject}
        maxLength={200}
      />

      <Button title={s.send} onPress={onSend} loading={saving} />
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
  selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  change: { color: colors.white, fontWeight: '700', textDecorationLine: 'underline' },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
});
