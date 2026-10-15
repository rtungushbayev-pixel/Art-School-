import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { fetchChats, isUnread, type ParentChat } from '../../lib/chats';
import { formatSupportDate } from '../../lib/support';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { ParentStackParamList, StaffStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    emptyParent: 'Чатов пока нет. Чтобы написать преподавателю, откройте карточку ребёнка и нажмите «Написать преподавателю».',
    emptyTeacher: 'Чатов пока нет. Родители могут написать вам из карточки ребёнка, а вы им — из профиля ученика.',
    about: (name: string) => `о ребёнке: ${name}`,
  },
  kk: {
    emptyParent: 'Әзірге чаттар жоқ. Мұғалімге жазу үшін бала карточкасын ашып, «Мұғалімге жазу» түймесін басыңыз.',
    emptyTeacher: 'Әзірге чаттар жоқ. Ата-аналар сізге бала карточкасынан, ал сіз оларға оқушы профилінен жаза аласыз.',
    about: (name: string) => `бала: ${name}`,
  },
  en: {
    emptyParent: 'No chats yet. To message a teacher, open your child’s card and tap “Message the teacher”.',
    emptyTeacher: 'No chats yet. Parents can message you from their child’s card, and you can message them from a student’s profile.',
    about: (name: string) => `about: ${name}`,
  },
};

// Чаты родителя с преподавателями (у родителя) или с родителями (у сотрудника).
export function ChatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList & ParentStackParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [chats, setChats] = useState<ParentChat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setChats(await fetchChats());
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;
  const isParent = profile.role === 'parent';

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      {chats.length === 0 && !loading ? (
        <Text style={styles.empty}>{isParent ? s.emptyParent : s.emptyTeacher}</Text>
      ) : null}
      {chats.map((chat) => {
        const other = isParent ? chat.teacher : chat.parent;
        const unread = isUnread(chat, profile.id);
        return (
          <Pressable key={chat.id} onPress={() => navigation.navigate('Chat', { chatId: chat.id })}>
            <Card style={styles.row}>
              <Avatar uri={other?.avatar_url} name={other?.full_name} size={44} />
              <View style={styles.info}>
                <Text style={[styles.name, unread && styles.unread]} numberOfLines={1}>
                  {other?.full_name ?? ''}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {s.about(chat.student?.full_name ?? '')} · {formatSupportDate(chat.last_message_at)}
                </Text>
              </View>
              {unread ? <View style={styles.dot} /> : null}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  unread: { fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
