import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { errorText } from '../../lib/errors';
import { EVENT_KINDS, eventKindLabel, fetchEvent, saveEvent, type EventKind } from '../../lib/events';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    title: 'Название',
    titlePlaceholder: 'Например: Весенняя выставка учеников',
    kind: 'Тип',
    startsOn: 'Дата начала (ГГГГ-ММ-ДД)',
    endsOn: 'Дата окончания (необязательно)',
    signupUntil: 'Запись до (необязательно, иначе до начала)',
    location: 'Место (необязательно)',
    max: 'Мест (необязательно)',
    description: 'Описание (необязательно)',
    save: 'Сохранить',
    needTitle: 'Укажите название',
    badDate: 'Даты в формате 2026-11-20; окончание не раньше начала',
    badMax: 'Число мест — целое число больше нуля',
    failed: 'Не удалось сохранить',
    hintNew: 'После сохранения ученики и родители получат уведомление.',
  },
  kk: {
    title: 'Атауы',
    titlePlaceholder: 'Мысалы: Оқушылардың көктемгі көрмесі',
    kind: 'Түрі',
    startsOn: 'Басталу күні (ЖЖЖЖ-АА-КК)',
    endsOn: 'Аяқталу күні (міндетті емес)',
    signupUntil: 'Жазылу мерзімі (міндетті емес)',
    location: 'Орны (міндетті емес)',
    max: 'Орын саны (міндетті емес)',
    description: 'Сипаттама (міндетті емес)',
    save: 'Сақтау',
    needTitle: 'Атауын көрсетіңіз',
    badDate: 'Күндер 2026-11-20 пішімінде; аяқталуы басталуынан ерте емес',
    badMax: 'Орын саны нөлден үлкен бүтін сан',
    failed: 'Сақтау мүмкін болмады',
    hintNew: 'Сақтағаннан кейін оқушылар мен ата-аналарға хабарлама барады.',
  },
  en: {
    title: 'Title',
    titlePlaceholder: 'For example: Spring student exhibition',
    kind: 'Type',
    startsOn: 'Start date (YYYY-MM-DD)',
    endsOn: 'End date (optional)',
    signupUntil: 'Sign-up until (optional, otherwise until start)',
    location: 'Place (optional)',
    max: 'Places (optional)',
    description: 'Description (optional)',
    save: 'Save',
    needTitle: 'Please enter a title',
    badDate: 'Use dates like 2026-11-20; the end must not be before the start',
    badMax: 'Places must be a whole number greater than zero',
    failed: 'Could not save',
    hintNew: 'After saving, students and parents will get a notification.',
  },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (v: string) => DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

export function EditEventScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'EditEvent'>>();
  const navigation = useNavigation();
  const eventId = route.params?.eventId ?? null;
  const s = useStrings(STRINGS);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('exhibition');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [signupUntil, setSignupUntil] = useState('');
  const [location, setLocation] = useState('');
  const [max, setMax] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    fetchEvent(eventId)
      .then((e) => {
        if (!e) return;
        setTitle(e.title);
        setKind(e.kind);
        setStartsOn(e.starts_on);
        setEndsOn(e.ends_on ?? '');
        setSignupUntil(e.signup_until ?? '');
        setLocation(e.location ?? '');
        setMax(e.max_participants ? String(e.max_participants) : '');
        setDescription(e.description ?? '');
      })
      .catch(() => {});
  }, [eventId]);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert(s.needTitle);
      return;
    }
    const start = startsOn.trim();
    const end = endsOn.trim();
    const until = signupUntil.trim();
    if (!validDate(start) || (end && (!validDate(end) || end < start)) || (until && !validDate(until))) {
      Alert.alert(s.badDate);
      return;
    }
    const places = max.trim() ? Number(max.trim()) : null;
    if (places !== null && (!Number.isInteger(places) || places <= 0)) {
      Alert.alert(s.badMax);
      return;
    }
    setSaving(true);
    try {
      await saveEvent(eventId, {
        title: title.trim(),
        kind,
        starts_on: start,
        ends_on: end || null,
        signup_until: until || null,
        location: location.trim() || null,
        max_participants: places,
        description: description.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      Alert.alert(s.failed, errorText(e));
    }
  };

  return (
    <Screen scroll>
      <TextField label={s.title} placeholder={s.titlePlaceholder} value={title} onChangeText={setTitle} maxLength={200} />
      <Text style={styles.label}>{s.kind}</Text>
      <View style={styles.row}>
        {EVENT_KINDS.map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} style={[styles.chip, kind === k && styles.chipActive]}>
            <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>{eventKindLabel(k)}</Text>
          </Pressable>
        ))}
      </View>
      <TextField label={s.startsOn} placeholder="2026-11-20" value={startsOn} onChangeText={setStartsOn} maxLength={10} />
      <TextField label={s.endsOn} placeholder="2026-11-30" value={endsOn} onChangeText={setEndsOn} maxLength={10} />
      <TextField label={s.signupUntil} placeholder="2026-11-15" value={signupUntil} onChangeText={setSignupUntil} maxLength={10} />
      <TextField label={s.location} value={location} onChangeText={setLocation} maxLength={300} />
      <TextField label={s.max} value={max} onChangeText={setMax} keyboardType="number-pad" maxLength={5} />
      <TextField
        label={s.description}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
        style={styles.textarea}
      />
      {!eventId ? <Text style={styles.hint}>{s.hintNew}</Text> : null}
      <Button title={s.save} onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
});
