import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { sendPushNotification } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { Announcement, AnnouncementAudience, Group } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: {
    audience: { all: 'Всем', students: 'Ученикам', staff: 'Сотрудникам', group: 'Группе' } as Record<AnnouncementAudience, string>,
    fillAll: 'Заполните заголовок и текст объявления',
    chooseGroup: 'Выберите группу',
    saveFailed: 'Не удалось сохранить',
    deleteTitle: 'Удалить объявление?',
    cancel: 'Отмена',
    delete: 'Удалить',
    editTitle: 'Редактировать объявление',
    newTitle: 'Новое объявление',
    heading: 'Заголовок',
    text: 'Текст',
    to: 'Кому',
    pin: 'Закрепить наверху',
    save: 'Сохранить',
    send: 'Отправить',
    deleteButton: 'Удалить объявление',
  },
  kk: {
    audience: { all: 'Барлығына', students: 'Оқушыларға', staff: 'Қызметкерлерге', group: 'Топқа' } as Record<AnnouncementAudience, string>,
    fillAll: 'Хабарландырудың тақырыбы мен мәтінін толтырыңыз',
    chooseGroup: 'Топты таңдаңыз',
    saveFailed: 'Сақтау мүмкін болмады',
    deleteTitle: 'Хабарландыруды жою керек пе?',
    cancel: 'Бас тарту',
    delete: 'Жою',
    editTitle: 'Хабарландыруды өңдеу',
    newTitle: 'Жаңа хабарландыру',
    heading: 'Тақырып',
    text: 'Мәтін',
    to: 'Кімге',
    pin: 'Жоғарыда бекіту',
    save: 'Сақтау',
    send: 'Жіберу',
    deleteButton: 'Хабарландыруды жою',
  },
  en: {
    audience: { all: 'Everyone', students: 'Students', staff: 'Staff', group: 'Group' } as Record<AnnouncementAudience, string>,
    fillAll: 'Fill in the announcement title and text',
    chooseGroup: 'Choose a group',
    saveFailed: 'Could not save',
    deleteTitle: 'Delete this announcement?',
    cancel: 'Cancel',
    delete: 'Delete',
    editTitle: 'Edit announcement',
    newTitle: 'New announcement',
    heading: 'Title',
    text: 'Text',
    to: 'To',
    pin: 'Pin to top',
    save: 'Save',
    send: 'Send',
    deleteButton: 'Delete announcement',
  },
};

const AUDIENCES: AnnouncementAudience[] = ['all', 'students', 'staff', 'group'];

export function ComposeAnnouncementScreen() {
  const navigation = useNavigation();
  const s = useStrings(STRINGS);
  const route = useRoute<RouteProp<StaffStackParamList, 'ComposeAnnouncement'>>();
  const announcementId = route.params?.announcementId;
  const isEditing = !!announcementId;
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('groups')
      .select('*')
      .order('name')
      .then(({ data }) => setGroups((data as Group[]) ?? []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!announcementId) return;
      supabase
        .from('announcements')
        .select('*')
        .eq('id', announcementId)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const a = data as Announcement;
          setTitle(a.title);
          setBody(a.body);
          setAudience(a.audience);
          setGroupId(a.group_id);
          setPinned(a.pinned);
        });
    }, [announcementId])
  );

  const onSend = async () => {
    if (!profile) return;
    if (!title.trim() || !body.trim()) {
      Alert.alert(s.fillAll);
      return;
    }
    if (audience === 'group' && !groupId) {
      Alert.alert(s.chooseGroup);
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      body: body.trim(),
      audience,
      group_id: audience === 'group' ? groupId : null,
      pinned,
    };
    const { data: saved, error } = isEditing
      ? await supabase.from('announcements').update(payload).eq('id', announcementId).select('id').single()
      : await supabase
          .from('announcements')
          .insert({ ...payload, author_id: profile.id })
          .select('id')
          .single();
    if (error) {
      setSaving(false);
      Alert.alert(s.saveFailed, error.message);
      return;
    }

    if (!isEditing) {
      // Сбой рассылки не критичен: объявление уже сохранено.
      await sendPushNotification({ event: 'announcement', id: saved.id });
    }

    setSaving(false);
    navigation.goBack();
  };

  const onDelete = () => {
    Alert.alert(s.deleteTitle, title, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          await supabase.from('announcements').delete().eq('id', announcementId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{isEditing ? s.editTitle : s.newTitle}</Text>

      <TextField label={s.heading} value={title} onChangeText={setTitle} />
      <TextField label={s.text} value={body} onChangeText={setBody} multiline numberOfLines={5} style={styles.textarea} />

      <Text style={styles.label}>{s.to}</Text>
      <View style={styles.audienceRow}>
        {AUDIENCES.map((value) => (
          <Pressable
            key={value}
            onPress={() => setAudience(value)}
            style={[styles.audienceOption, audience === value && styles.audienceOptionActive]}
          >
            <Text style={[styles.audienceText, audience === value && styles.audienceTextActive]}>
              {s.audience[value]}
            </Text>
          </Pressable>
        ))}
      </View>

      {audience === 'group' ? (
        <View style={styles.groupList}>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setGroupId(g.id)}
              style={[styles.groupOption, groupId === g.id && styles.groupOptionActive]}
            >
              <Text style={[styles.groupText, groupId === g.id && styles.groupTextActive]}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.pinRow}>
        <Text style={styles.label}>{s.pin}</Text>
        <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: colors.primary }} />
      </View>

      <Button title={isEditing ? s.save : s.send} onPress={onSend} loading={saving} />

      {isEditing ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title={s.deleteButton} variant="danger" onPress={onDelete} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  audienceOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  audienceOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  audienceText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  audienceTextActive: { color: colors.white },
  groupList: { marginBottom: spacing.md, gap: spacing.xs },
  groupOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupOptionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  groupText: { color: colors.text, fontWeight: '600' },
  groupTextActive: { color: colors.white },
  pinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
});
