import React, { useCallback, useRef, useState } from 'react';
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
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  fetchSupportMessages,
  fetchSupportTicket,
  formatSupportDate,
  sendSupportMessage,
  setSupportTicketStatus,
  type SupportMessageWithAuthor,
  type SupportTicketWithAuthor,
} from '../../lib/support';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

// Высота стандартного заголовка native-stack без системной панели сверху.
const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56;

// Переписка по обращению: автор и сотрудники пишут в одном окне.
export function SupportTicketScreen() {
  const route = useRoute<RouteProp<NavParamList, 'SupportTicket'>>();
  const { ticketId } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [ticket, setTicket] = useState<SupportTicketWithAuthor | null>(null);
  const [messages, setMessages] = useState<SupportMessageWithAuthor[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([fetchSupportTicket(ticketId), fetchSupportMessages(ticketId)]);
      setTicket(t);
      setMessages(m);
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoaded(true);
  }, [ticketId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;

  if (!ticket) {
    return (
      <View style={styles.center}>
        {loaded ? <Text style={styles.muted}>Обращение не найдено</Text> : null}
      </View>
    );
  }

  const isStaff = profile.role === 'staff';
  const isAuthor = ticket.author_id === profile.id;
  const closed = ticket.status === 'closed';

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendSupportMessage(ticket.id, profile.id, body);
      setText('');
      await load();
    } catch (e) {
      Alert.alert('Не удалось отправить', e instanceof Error ? e.message : undefined);
    }
    setSending(false);
  };

  const changeStatus = async (status: 'open' | 'closed') => {
    try {
      await setSupportTicketStatus(ticket.id, status);
      await load();
    } catch (e) {
      Alert.alert('Не удалось изменить статус', e instanceof Error ? e.message : undefined);
    }
  };

  const onClose = () => {
    Alert.alert('Закрыть обращение?', isAuthor ? 'Если вопрос решён. Написать снова можно в любой момент.' : '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Закрыть', onPress: () => changeStatus('closed') },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={insets.top + HEADER_HEIGHT}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <Card>
          <Text style={styles.subject}>{ticket.subject}</Text>
          <Text style={styles.muted}>
            {SUPPORT_CATEGORY_LABELS[ticket.category]} · {SUPPORT_STATUS_LABELS[ticket.status]}
          </Text>
          {isStaff ? (
            <Text style={styles.muted}>
              От: {ticket.author?.full_name || 'Без имени'}
              {ticket.device_info ? ` · ${ticket.device_info}` : ''}
            </Text>
          ) : null}
          {isStaff || (isAuthor && !closed) ? (
            <View style={styles.statusAction}>
              {closed ? (
                <Button title="Открыть снова" variant="secondary" onPress={() => changeStatus('open')} />
              ) : (
                <Button title="Закрыть обращение" variant="secondary" onPress={onClose} />
              )}
            </View>
          ) : null}
        </Card>

        {messages.map((message) => {
          const mine = message.author_id === profile.id;
          const fromStaff = message.author?.role === 'staff' && message.author_id !== ticket.author_id;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleAuthor, mine && styles.textOnPrimary]}>
                {mine ? 'Вы' : fromStaff ? `${message.author?.full_name ?? ''} · администрация` : message.author?.full_name}
              </Text>
              <Text style={[styles.bubbleText, mine && styles.textOnPrimary]}>{message.body}</Text>
              <Text style={[styles.bubbleTime, mine && styles.textOnPrimary]}>
                {formatSupportDate(message.created_at)}
              </Text>
            </View>
          );
        })}

        {closed ? (
          <Text style={[styles.muted, styles.closedNote]}>
            Обращение закрыто. Если напишете сообщение, оно откроется снова.
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          placeholder={isStaff && !isAuthor ? 'Ответ пользователю' : 'Сообщение'}
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
          accessibilityLabel="Отправить"
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
  subject: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  muted: { color: colors.textMuted, fontSize: 13 },
  statusAction: { marginTop: spacing.md },
  closedNote: { textAlign: 'center', marginTop: spacing.sm },
  bubble: { maxWidth: '85%', padding: spacing.sm + 4, borderRadius: radius.md, marginBottom: spacing.sm },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleAuthor: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
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
