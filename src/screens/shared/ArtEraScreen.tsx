import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Screen } from '../../components/Screen';
import { KoshkarMuiz } from '../../components/KoshkarMuiz';
import { artImage, findEra, type Artwork, type Era, type QuizQuestion } from '../../lib/artHistory';
import { eraVideoUrl, speak, stopSpeaking } from '../../lib/artGuide';
import { findHero } from '../../lib/heroes';
import { pick, useLanguage, useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const STRINGS = {
  ru: {
    listen: 'Послушать рассказ',
    stop: 'Остановить',
    video: 'Видео-экскурсия',
    works: 'Главные работы',
    fact: 'Знаешь ли ты?',
    heroes: 'Художники этой эпохи',
    quiz: 'Проверь себя',
    right: 'Верно!',
    wrong: 'Не совсем.',
    score: (n: number, total: number) => `Правильных ответов: ${n} из ${total}`,
    again: 'Пройти ещё раз',
    ask: 'Спросить гида про эту эпоху',
    notFound: 'Эпоха не найдена',
  },
  kk: {
    listen: 'Әңгімені тыңдау',
    stop: 'Тоқтату',
    video: 'Бейне-экскурсия',
    works: 'Басты туындылар',
    fact: 'Білесің бе?',
    heroes: 'Осы дәуірдің суретшілері',
    quiz: 'Өзіңді тексер',
    right: 'Дұрыс!',
    wrong: 'Онша емес.',
    score: (n: number, total: number) => `Дұрыс жауаптар: ${total} ішінен ${n}`,
    again: 'Қайта өту',
    ask: 'Гидтен осы дәуір туралы сұрау',
    notFound: 'Дәуір табылмады',
  },
  en: {
    listen: 'Listen to the story',
    stop: 'Stop',
    video: 'Video tour',
    works: 'Key works',
    fact: 'Did you know?',
    heroes: 'Artists of this era',
    quiz: 'Test yourself',
    right: 'Correct!',
    wrong: 'Not quite.',
    score: (n: number, total: number) => `Correct answers: ${n} of ${total}`,
    again: 'Try again',
    ask: 'Ask the guide about this era',
    notFound: 'Era not found',
  },
};

export function ArtEraScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const era = findEra(route.params?.eraId);
  const [speaking, setSpeaking] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (era) navigation.setOptions({ title: pick(era.title, lang) });
  }, [era, lang, navigation]);

  useEffect(() => {
    let alive = true;
    if (era) eraVideoUrl(era.id).then((url) => alive && setVideoUrl(url));
    return () => {
      alive = false;
    };
  }, [era]);

  // Уходим с экрана — гид замолкает.
  useFocusEffect(
    React.useCallback(() => () => {
      stopSpeaking();
      setSpeaking(false);
    }, [])
  );

  if (!era) {
    return (
      <Screen>
        <Text style={styles.text}>{s.notFound}</Text>
      </Screen>
    );
  }

  const toggleListen = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    // Рассказ всегда на русском: тексты эпох пока только на нём.
    speak(era.story.join(' '), 'ru', { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
  };

  return (
    <Screen scroll>
      <View style={[styles.banner, { backgroundColor: era.color }]}>
        <Ionicons name={era.icon as any} size={34} color={colors.white} />
        <Text style={styles.bannerTitle}>{pick(era.title, lang)}</Text>
        <Text style={styles.bannerYears}>{era.years}</Text>
      </View>

      {videoUrl ? <EraVideo url={videoUrl} label={s.video} /> : null}

      <Pressable style={styles.listen} onPress={toggleListen}>
        <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-high-outline'} size={20} color={colors.primary} />
        <Text style={styles.listenText}>{speaking ? s.stop : s.listen}</Text>
      </Pressable>

      {era.story.map((p, i) => (
        <Text key={i} style={styles.text}>
          {p}
        </Text>
      ))}

      <Text style={styles.section}>{s.works}</Text>
      {era.works.map((w) => (
        <WorkCard key={w.image} work={w} />
      ))}

      <View style={styles.fact}>
        <Text style={styles.factTitle}>{s.fact}</Text>
        <Text style={styles.text}>{era.fact}</Text>
      </View>

      {era.heroes.length > 0 ? (
        <>
          <Text style={styles.section}>{s.heroes}</Text>
          <View style={styles.chips}>
            {era.heroes.map((id) => {
              const hero = findHero(id);
              if (!hero) return null;
              return (
                <Pressable key={id} style={styles.chip} onPress={() => navigation.navigate('ArtArtist', { heroId: id })}>
                  <Text style={styles.chipText}>{pick(hero.name, lang)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.section}>{s.quiz}</Text>
      <Quiz era={era} />

      <Pressable style={styles.ask} onPress={() => navigation.navigate('AskGuide', { eraId: era.id })}>
        <Ionicons name="chatbubbles-outline" size={18} color="#0E2226" />
        <Text style={styles.askText}>{s.ask}</Text>
      </Pressable>
    </Screen>
  );
}

function EraVideo({ url, label }: { url: string; label: string }) {
  const player = useVideoPlayer(url);
  return (
    <View style={styles.videoWrap}>
      <Text style={styles.videoLabel}>{label}</Text>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} />
    </View>
  );
}

function WorkCard({ work }: { work: Artwork }) {
  const img = artImage(work.image);
  return (
    <View style={styles.work}>
      {work.image === 'koshkar_muiz' ? (
        <View style={styles.ornament}>
          <KoshkarMuiz size={220} />
        </View>
      ) : img ? (
        <Image source={img.source} style={styles.workImage} contentFit="contain" />
      ) : null}
      <View style={styles.workBody}>
        <Text style={styles.workTitle}>{work.title}</Text>
        <Text style={styles.workMeta}>
          {work.author} · {work.year}
        </Text>
        <Text style={styles.workNote}>{work.note}</Text>
        {img?.credit ? <Text style={styles.credit}>{img.credit}</Text> : null}
      </View>
    </View>
  );
}

function Quiz({ era }: { era: Era }) {
  const s = useStrings(STRINGS);
  const [answers, setAnswers] = useState<(number | null)[]>(() => era.quiz.map(() => null));
  const done = answers.every((a) => a !== null);
  const correct = answers.filter((a, i) => a === era.quiz[i].answer).length;

  return (
    <View>
      {era.quiz.map((q, qi) => (
        <QuestionCard
          key={qi}
          q={q}
          chosen={answers[qi]}
          onChoose={(i) => setAnswers((prev) => prev.map((a, j) => (j === qi && a === null ? i : a)))}
        />
      ))}
      {done ? (
        <View style={styles.score}>
          <Text style={styles.scoreText}>{s.score(correct, era.quiz.length)}</Text>
          <Pressable onPress={() => setAnswers(era.quiz.map(() => null))}>
            <Text style={styles.again}>{s.again}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function QuestionCard({ q, chosen, onChoose }: { q: QuizQuestion; chosen: number | null; onChoose: (i: number) => void }) {
  const s = useStrings(STRINGS);
  return (
    <View style={styles.question}>
      <Text style={styles.questionText}>{q.question}</Text>
      {q.options.map((opt, i) => {
        const isRight = chosen !== null && i === q.answer;
        const isWrong = chosen === i && i !== q.answer;
        return (
          <Pressable
            key={i}
            disabled={chosen !== null}
            onPress={() => onChoose(i)}
            style={[styles.option, isRight && styles.optionRight, isWrong && styles.optionWrong]}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </Pressable>
        );
      })}
      {chosen !== null ? (
        <Text style={styles.explain}>
          <Text style={{ fontWeight: '700' }}>{chosen === q.answer ? s.right : s.wrong} </Text>
          {q.explain}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  bannerTitle: { fontFamily: fonts.hand, fontSize: 34, color: colors.white, textAlign: 'center', marginTop: 4 },
  bannerYears: { color: colors.white, opacity: 0.9, fontSize: 13 },
  videoWrap: { marginBottom: spacing.md },
  videoLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  video: { width: '100%', aspectRatio: 9 / 16, maxHeight: 480, borderRadius: radius.md, backgroundColor: '#0E2226' },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  listenText: { color: colors.primary, fontWeight: '700' },
  text: { fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: spacing.sm },
  section: { fontFamily: fonts.hand, fontSize: 28, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  work: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  workImage: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.surfaceAlt },
  ornament: { alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.surfaceAlt },
  workBody: { padding: spacing.md },
  workTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  workMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  workNote: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  credit: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm },
  fact: {
    backgroundColor: '#FFF4D6',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    marginTop: spacing.sm,
  },
  factTitle: { fontFamily: fonts.hand, fontSize: 24, color: colors.primary, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: colors.primary, fontWeight: '600' },
  question: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  questionText: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  optionRight: { backgroundColor: '#DFF2E5', borderColor: colors.success },
  optionWrong: { backgroundColor: '#F8DEDC', borderColor: colors.danger },
  optionText: { fontSize: 15, color: colors.text },
  explain: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: 4 },
  score: { alignItems: 'center', paddingVertical: spacing.md },
  scoreText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  again: { color: colors.primary, textDecorationLine: 'underline', marginTop: 6 },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5FF2E6',
    borderRadius: radius.full,
    paddingVertical: 12,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  askText: { color: '#0E2226', fontWeight: '700', fontSize: 15 },
});
