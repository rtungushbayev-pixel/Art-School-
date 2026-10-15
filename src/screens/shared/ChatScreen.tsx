import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { errorText } from '../../lib/errors';
import {
  fetchChat,
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
  type ChatMessage,
  type ParentChat,
} from '../../lib/chats';
import { formatSupportDate } from '../../lib/support';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
const REFRESH_MS = 10000;

const STRINGS = {
  ru: {
    notFound: 'Чат не найден',
    about: (name: string) => `О ребёнке: ${name}`,
    placeholder: 'Сообщение',
    send: 'Отправить',
    sendFailed: 'Не удалось отправить',
    tooMany: 'Слишком много сообщений. Попробуйте позже.',
    hint: 'Сообщения видите только вы двое.',
  },
  kk: {
    notFound: 'Чат табылмады',
    about: (name: string) => `Бала: ${name}`,
    placeholder: 'Хабарлама',
    send: 'Жіберу',
    sendFailed: 'Жіберу мүмкін болмады',
    tooMany: 'Хабарлама тым көп. Кейінірек қайталаңыз.',
    hint: 'Хабарламаларды тек сіз екеуіңіз көресіз.',
  },
  en: {
    notFound: 'Chat not found',
    about: (name: string) => `About: ${name}`,
    placeholder: 'Message',
    send: 'Send',
    sendFailed: 'Could not send',
    tooMany: 'Too many messages. Please try later.',
    hint: 'Only the two of you can see these messages.',
  },
};

// Переписка родителя с преподавателем о ребёнке.
export function ChatScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'Chat'>>();
  const navigation = useNavigation();
  const { chatId } = route.params;
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [chat, setChat] = useState<ParentChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([fetchChat(chatId), fetchChatMessages(chatId)]);
      setChat(c);
      setMessages(m);
      markChatRead(chatId);
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoaded(true);
  }, [chatId]);

  // Пока экран открыт — подгружаем новые сообщения.
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  const other = chat && profile ? (chat.parent_id === profile.id ? chat.teacher : chat.parent) : null;

  useEffect(() => {
    if (other?.full_name) navigation.setOptions({ title: other.full_name });
  }, [navigation, other?.full_name]);

  if (!profile) return null;

  if (!chat) {
    return <View style={styles.center}>{loaded ? <Text style={styles.muted}>{s.notFound}</Text> : null}</View>;
  }

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendChatMessage(chat.id, body);
      setText('');
      await load();
    } catch (e) {
      const t = errorText(e) ?? '';
      Alert.alert(s.sendFailed, t.includes('rate_limited') ? s.tooMany : t);
    }
    setSending(false);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={insets.top + HEADER_HEIGHT}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <Text style={styles.about}>{s.about(chat.student?.full_name ?? '')}</Text>
        <Text style={[styles.muted, styles.hint]}>{s.hint}</Text>
        {messages.map((m) => {
          const mine = m.author_id === profile.id;
          return (
            <View key={m.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, mine && styles.textOnPrimary]}>{m.body}</Text>
              <Text style={[styles.bubbleTime, mine && styles.textOnPrimary]}>{formatSupportDate(m.created_at)}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          placeholder={s.placeholder}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
        />
        <Pressable
          onPress={onSend}
          disabled={sending || !text.trim()}
          style={[styles.sendButton, (sending || !text.trim()) && styles.sendDisabled]}
          accessibilityLabel={s.send}
        >
          <Ionicons name="send" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.md },
  about: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
  hint: { textAlign: 'center', marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: 13 },
  bubble: { maxWidth: '85%', padding: spacing.sm + 4, borderRadius: radius.md, marginBottom: spacing.sm },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.text, fontSize: 15 },
  bubbleTime: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs, alignSelf: 'flex-end' },
  textOnPrimary: { color: colors.white },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
