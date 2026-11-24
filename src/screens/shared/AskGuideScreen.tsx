import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { GuideAvatar } from '../../components/GuideAvatar';
import {
  GUIDE_DAILY_LIMIT,
  GUIDE_MAX_QUESTION,
  askGuide,
  speak,
  stopSpeaking,
  type GuideMessage,
} from '../../lib/artGuide';
import { findEra } from '../../lib/artHistory';
import { FEATURES } from '../../lib/features';
import { eraFaq, generalFaq, heroFaq, type GuideFaq } from '../../lib/guideFaq';
import { findHero } from '../../lib/heroes';
import { pick, useLanguage, useStrings } from '../../i18n';
import { radius, spacing } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

// «Спроси гида»: ребёнок задаёт вопрос текстом (или голосом через микрофон
// на клавиатуре телефона), гид отвечает текстом и вслух.
// Разговор нигде не сохраняется: закрыл экран — он исчез.
//
// Пока живое общение выключено (FEATURES.aiGuide), гид отвечает на
// заготовленные вопросы (lib/guideFaq): ребёнок выбирает вопрос из списка,
// ничего не уходит в интернет.

const HOLO = '#5FF2E6';
const BG = '#0B1B1E';

const STRINGS = {
  ru: {
    title: 'Спроси гида',
    pickQuestion: 'Выбери вопрос:',
    helloFaq: "Привет! Я гид по искусству. Выбери вопрос, и я расскажу ответ.",
    hello: 'Привет! Я гид по искусству. Спроси меня про художников, картины, краски или любую эпоху.',
    helloEra: (t: string) => `Привет! Давай поговорим про эпоху «${t}». Что тебе интересно?`,
    helloHero: (n: string) => `Привет! Хочешь узнать больше про художника ${n}? Спрашивай!`,
    placeholder: 'Напиши вопрос…',
    privacy: 'Не пиши своё имя, телефон и адрес. Чтобы спросить голосом, нажми микрофон на клавиатуре.',
    voiceOn: 'Голос включён',
    voiceOff: 'Голос выключен',
    left: (n: number) => `Осталось вопросов на сегодня: ${n}`,
    limit: `На сегодня вопросы закончились (${GUIDE_DAILY_LIMIT} в день). Приходи завтра!`,
    unavailable: 'Гид пока отдыхает. Скоро он заработает.',
    error: 'Не получилось получить ответ. Проверь интернет и попробуй ещё раз.',
    ideas: ['Кто такой Кастеев?', 'Почему Мона Лиза улыбается?', 'Как смешать зелёный цвет?', 'Что такое перспектива?'],
  },
  kk: {
    title: 'Гидтен сұра',
    pickQuestion: 'Сұрақты таңда:',
    helloFaq: "Сәлем! Мен өнер бойынша гидпін. Сұрақты таңда, мен жауабын айтып беремін.",
    hello: 'Сәлем! Мен өнер бойынша гидпін. Суретшілер, суреттер, бояулар немесе кез келген дәуір туралы сұра.',
    helloEra: (t: string) => `Сәлем! «${t}» дәуірі туралы сөйлесейік. Саған не қызық?`,
    helloHero: (n: string) => `Сәлем! ${n} туралы көбірек білгің келе ме? Сұра!`,
    placeholder: 'Сұрағыңды жаз…',
    privacy: 'Атыңды, телефоныңды және мекенжайыңды жазба. Дауыспен сұрау үшін пернетақтадағы микрофонды бас.',
    voiceOn: 'Дауыс қосулы',
    voiceOff: 'Дауыс өшірулі',
    left: (n: number) => `Бүгінге қалған сұрақтар: ${n}`,
    limit: `Бүгінгі сұрақтар бітті (күніне ${GUIDE_DAILY_LIMIT}). Ертең кел!`,
    unavailable: 'Гид әзірге демалып жатыр. Жақында жұмыс істейді.',
    error: 'Жауап алу мүмкін болмады. Интернетті тексеріп, қайталап көр.',
    ideas: ['Қастеев кім?', 'Мона Лиза неге күледі?', 'Жасыл түсті қалай араластырады?', 'Перспектива деген не?'],
  },
  en: {
    title: 'Ask the guide',
    pickQuestion: 'Pick a question:',
    helloFaq: "Hi! I am your art guide. Pick a question and I'll tell you the answer.",
    hello: 'Hi! I am your art guide. Ask me about artists, paintings, colours or any era.',
    helloEra: (t: string) => `Hi! Let's talk about ${t}. What would you like to know?`,
    helloHero: (n: string) => `Hi! Want to know more about ${n}? Ask away!`,
    placeholder: 'Type a question…',
    privacy: "Don't write your name, phone or address. To ask by voice, tap the microphone on your keyboard.",
    voiceOn: 'Voice on',
    voiceOff: 'Voice off',
    left: (n: number) => `Questions left today: ${n}`,
    limit: `No more questions today (${GUIDE_DAILY_LIMIT} a day). Come back tomorrow!`,
    unavailable: 'The guide is resting for now. It will be available soon.',
    error: "Couldn't get an answer. Check your internet and try again.",
    ideas: ['Who was Kasteyev?', 'Why is the Mona Lisa smiling?', 'How do I mix green?', 'What is perspective?'],
  },
};

export function AskGuideScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const era = findEra(route.params?.eraId, lang);
  const hero = findHero(route.params?.heroId);

  const live = FEATURES.aiGuide;
  const greeting = era
    ? s.helloEra(pick(era.title, lang))
    : hero
      ? s.helloHero(pick(hero.name, lang))
      : live
        ? s.hello
        : s.helloFaq;

  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Заготовленные вопросы: со страницы эпохи или художника — только про
  // них, из общего раздела — общие вопросы об искусстве.
  const faqs = useMemo<GuideFaq[]>(
    () => (era ? eraFaq(era.id, lang) : hero ? heroFaq(hero.id, lang) : generalFaq(lang)),
    [era, hero, lang]
  );
  const asked = new Set(messages.filter((m) => m.role === 'user').map((m) => m.content));
  const openFaqs = faqs.filter((f) => !asked.has(f.question));

  useEffect(() => {
    navigation.setOptions({ title: s.title });
  }, [navigation, s.title]);

  useFocusEffect(
    React.useCallback(() => () => {
      stopSpeaking();
      setSpeaking(false);
    }, [])
  );

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages, busy, notice]);

  const say = (text: string) => {
    if (!voice) return;
    speak(text, lang, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
  };

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, GUIDE_MAX_QUESTION);
    if (!text || busy) return;
    stopSpeaking();
    setNotice(null);
    setInput('');
    const history: GuideMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setBusy(true);
    const result = await askGuide(history, lang, { era: era?.id, hero: hero?.id });
    setBusy(false);
    if (result.ok) {
      setMessages([...history, { role: 'assistant', content: result.answer }]);
      if (result.remaining !== null) setRemaining(result.remaining);
      say(result.answer);
    } else {
      // Вопрос без ответа убираем из истории, чтобы его можно было задать ещё раз.
      setMessages(messages);
      setInput(text);
      setNotice(result.reason === 'limit' ? s.limit : result.reason === 'unavailable' ? s.unavailable : s.error);
      if (result.reason === 'limit') setRemaining(0);
    }
  };

  const askFaq = (faq: GuideFaq) => {
    stopSpeaking();
    setMessages((prev) => [...prev, { role: 'user', content: faq.question }, { role: 'assistant', content: faq.answer }]);
    say(faq.answer);
  };

  const toggleVoice = () => {
    if (voice) {
      stopSpeaking();
      setSpeaking(false);
    }
    setVoice(!voice);
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.top}>
          <GuideAvatar size={130} speaking={speaking} />
          <Pressable style={styles.voice} onPress={toggleVoice} hitSlop={8}>
            <Ionicons name={voice ? 'volume-high' : 'volume-mute'} size={18} color={HOLO} />
            <Text style={styles.voiceText}>{voice ? s.voiceOn : s.voiceOff}</Text>
          </Pressable>
        </View>

        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          <Bubble role="assistant" text={greeting} onSpeak={voice ? () => say(greeting) : undefined} />
          {messages.map((m, i) => (
            <Bubble
              key={i}
              role={m.role}
              text={m.content}
              onSpeak={m.role === 'assistant' && voice ? () => say(m.content) : undefined}
            />
          ))}
          {busy ? <ActivityIndicator color={HOLO} style={styles.busy} /> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {!live ? (
            <>
              {openFaqs.length ? <Text style={styles.pick}>{s.pickQuestion}</Text> : null}
              <View style={styles.ideas}>
                {openFaqs.map((faq) => (
                  <Pressable key={faq.question} style={styles.idea} onPress={() => askFaq(faq)}>
                    <Text style={styles.ideaText}>{faq.question}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : messages.length === 0 && !busy ? (
            <View style={styles.ideas}>
              {s.ideas.map((idea) => (
                <Pressable key={idea} style={styles.idea} onPress={() => send(idea)}>
                  <Text style={styles.ideaText}>{idea}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {live ? (
        <View style={styles.bottom}>
          <Text style={styles.privacy}>{s.privacy}</Text>
          {remaining !== null ? <Text style={styles.left}>{s.left(remaining)}</Text> : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={s.placeholder}
              placeholderTextColor="#6F9A97"
              maxLength={GUIDE_MAX_QUESTION}
              multiline
              editable={!busy && remaining !== 0}
            />
            <Pressable
              style={[styles.send, (!input.trim() || busy) && styles.sendDisabled]}
              disabled={!input.trim() || busy}
              onPress={() => send(input)}
            >
              <Ionicons name="arrow-up" size={22} color={BG} />
            </Pressable>
          </View>
        </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ role, text, onSpeak }: { role: GuideMessage['role']; text: string; onSpeak?: () => void }) {
  const mine = role === 'user';
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.bubbleText, mine && styles.mineText]}>{text}</Text>
      {onSpeak ? (
        <Pressable onPress={onSpeak} hitSlop={8} style={styles.replay}>
          <Ionicons name="volume-medium-outline" size={16} color={HOLO} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  top: { alignItems: 'center', paddingTop: spacing.sm },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  voiceText: { color: HOLO, fontSize: 12 },
  list: { padding: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: '86%', borderRadius: radius.lg, padding: spacing.md },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#12313A', borderWidth: 1, borderColor: '#1F5A5F' },
  mine: { alignSelf: 'flex-end', backgroundColor: HOLO },
  bubbleText: { color: '#E3FAF7', fontSize: 16, lineHeight: 23 },
  mineText: { color: BG },
  replay: { alignSelf: 'flex-end', marginTop: 4 },
  busy: { alignSelf: 'flex-start', marginLeft: spacing.md },
  notice: { color: '#FFD38A', fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
  pick: { color: '#7FA9A5', fontSize: 13, marginTop: spacing.sm },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  idea: { borderWidth: 1, borderColor: HOLO, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  ideaText: { color: HOLO, fontSize: 14 },
  bottom: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: '#1F3C40' },
  privacy: { color: '#7FA9A5', fontSize: 11, marginBottom: 4 },
  left: { color: HOLO, fontSize: 11, marginBottom: 4, fontFamily: fonts.round },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: '#12313A',
    color: '#E3FAF7',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: HOLO, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
