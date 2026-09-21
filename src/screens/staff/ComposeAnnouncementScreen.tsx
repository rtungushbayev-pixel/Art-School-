import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { resolveAudienceRecipientIds } from '../../lib/announcements';
import { sendPushNotification } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { Announcement, AnnouncementAudience, Group } from '../../types/database';
import type { StaffStackParamList } from '../../navigation/types';

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: 'all', label: 'Всем' },
  { value: 'students', label: 'Ученикам' },
  { value: 'staff', label: 'Сотрудникам' },
  { value: 'group', label: 'Группе' },
];

export function ComposeAnnouncementScreen() {
  const navigation = useNavigation();
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
      Alert.alert('Заполните заголовок и текст объявления');
      return;
    }
    if (audience === 'group' && !groupId) {
      Alert.alert('Выберите группу');
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
    const { error } = isEditing
      ? await supabase.from('announcements').update(payload).eq('id', announcementId)
      : await supabase.from('announcements').insert({ ...payload, author_id: profile.id });
    if (error) {
      setSaving(false);
      Alert.alert('Не удалось сохранить', error.message);
      return;
    }

    if (!isEditing) {
      try {
        const recipientIds = (await resolveAudienceRecipientIds(audience, groupId)).filter((id) => id !== profile.id);
        await sendPushNotification({ userIds: recipientIds, title: title.trim(), body: body.trim() });
      } catch {
        // объявление уже сохранено — сбой рассылки пушей не критичен
      }
    }

    setSaving(false);
    navigation.goBack();
  };

  const onDelete = () => {
    Alert.alert('Удалить объявление?', title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
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
      <Text style={styles.title}>{isEditing ? 'Редактировать объявление' : 'Новое объявление'}</Text>

      <TextField label="Заголовок" value={title} onChangeText={setTitle} />
      <TextField label="Текст" value={body} onChangeText={setBody} multiline numberOfLines={5} style={styles.textarea} />

      <Text style={styles.label}>Кому</Text>
      <View style={styles.audienceRow}>
        {AUDIENCES.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setAudience(opt.value)}
            style={[styles.audienceOption, audience === opt.value && styles.audienceOptionActive]}
          >
            <Text style={[styles.audienceText, audience === opt.value && styles.audienceTextActive]}>
              {opt.label}
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
        <Text style={styles.label}>Закрепить наверху</Text>
        <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: colors.primary }} />
      </View>

      <Button title={isEditing ? 'Сохранить' : 'Отправить'} onPress={onSend} loading={saving} />

      {isEditing ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button title="Удалить объявление" variant="danger" onPress={onDelete} />
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
