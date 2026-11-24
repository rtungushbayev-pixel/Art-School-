import React, { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { GuideAvatar } from '../../components/GuideAvatar';
import { HeroAvatar } from '../../components/HeroAvatar';
import { useAuth } from '../../hooks/useAuth';
import { ONLINE_COURSE_URL, erasFor } from '../../lib/artHistory';
import { HEROES, heroPhoto } from '../../lib/heroes';
import { FEATURES } from '../../lib/features';
import { pick, useLanguage, useStrings } from '../../i18n';
import { colors, radius, shadow, spacing } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const STRINGS = {
  ru: {
    title: 'История искусств',
    guideTitle: 'Гид по искусству',
    guideText: 'Задай любой вопрос про художников, картины и эпохи. Гид ответит голосом.',
    guideTextFaq: 'Выбери вопрос про художников, краски и картины, и гид расскажет ответ голосом.',
    ask: 'Спросить гида',
    eras: 'Путешествие во времени',
    artists: 'Великие художники',
    courseTitle: 'Онлайн-обучение школы',
    courseText:
      'Уроки рисунка и живописи в записи и с преподавателем, для учеников от 11 лет. Курсы «Базовый» и «Творческая мастерская».',
    courseOpen: 'Подробнее на сайте',
    courseKid: 'Покажи эту карточку родителям: курс выбирают и оплачивают на сайте школы.',
  },
  kk: {
    title: 'Өнер тарихы',
    guideTitle: 'Өнер бойынша гид',
    guideText: 'Суретшілер, суреттер мен дәуірлер туралы кез келген сұрақ қой. Гид дауыспен жауап береді.',
    guideTextFaq: 'Суретшілер, бояулар мен суреттер туралы сұрақты таңда, гид жауабын дауыспен айтады.',
    ask: 'Гидтен сұрау',
    eras: 'Уақыт бойынша саяхат',
    artists: 'Ұлы суретшілер',
    courseTitle: 'Мектептің онлайн-оқуы',
    courseText:
      '11 жастан бастап оқушыларға арналған сурет пен кескіндеме сабақтары, жазбада және оқытушымен. «Базалық» және «Шығармашылық шеберхана» курстары.',
    courseOpen: 'Сайтта толығырақ',
    courseKid: 'Бұл карточканы ата-анаңа көрсет: курсты мектеп сайтында таңдап, төлейді.',
  },
  en: {
    title: 'Art history',
    guideTitle: 'Art guide',
    guideText: 'Ask anything about artists, paintings and eras. The guide answers out loud.',
    guideTextFaq: 'Pick a question about artists, colours and paintings, and the guide will answer out loud.',
    ask: 'Ask the guide',
    eras: 'Journey through time',
    artists: 'Great artists',
    courseTitle: 'School online courses',
    courseText:
      'Recorded drawing and painting lessons, with or without a teacher, for students aged 11+. Courses: “Basic” and “Creative workshop”.',
    courseOpen: 'Learn more on the website',
    courseKid: 'Show this card to your parents: courses are chosen and paid for on the school website.',
  },
};

export function ArtHistoryScreen() {
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const { profile } = useAuth();
  // Ссылку на покупку курса видят взрослые: родители и сотрудники.
  const isAdult = profile?.role !== 'student';

  useEffect(() => {
    navigation.setOptions({ title: s.title });
  }, [navigation, s.title]);

  return (
    <Screen scroll>
      <Pressable style={styles.guide} onPress={() => navigation.navigate('AskGuide')}>
        <GuideAvatar size={120} />
        <View style={styles.guideBody}>
          <Text style={styles.guideTitle}>{s.guideTitle}</Text>
          <Text style={styles.guideText}>{FEATURES.aiGuide ? s.guideText : s.guideTextFaq}</Text>
          <View style={styles.guideButton}>
            <Ionicons name="mic-outline" size={18} color="#0E2226" />
            <Text style={styles.guideButtonText}>{s.ask}</Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.section}>{s.eras}</Text>
      {erasFor(lang).map((era, i) => (
        <Pressable
          key={era.id}
          style={({ pressed }) => [styles.era, pressed && styles.pressed]}
          onPress={() => navigation.navigate('ArtEra', { eraId: era.id })}
        >
          <View style={[styles.eraBadge, { backgroundColor: era.color }]}>
            <Ionicons name={era.icon as any} size={22} color={colors.white} />
            <Text style={styles.eraNum}>{i + 1}</Text>
          </View>
          <View style={styles.eraBody}>
            <Text style={styles.eraTitle}>{pick(era.title, lang)}</Text>
            <Text style={styles.eraYears}>{era.years}</Text>
            <Text style={styles.eraIntro}>{era.intro}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}

      <Text style={styles.section}>{s.artists}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artists}>
        {HEROES.map((hero) => (
          <Pressable key={hero.id} style={styles.artist} onPress={() => navigation.navigate('ArtArtist', { heroId: hero.id })}>
            {heroPhoto(hero) ? (
              <Image source={heroPhoto(hero)} style={styles.portrait} contentFit="cover" contentPosition="top" />
            ) : (
              <View style={styles.portraitFallback}>
                <HeroAvatar hero={hero} stage={5} size={72} />
              </View>
            )}
            <Text style={styles.artistName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
              {pick(hero.name, lang)}
            </Text>
            <Text style={styles.artistYears}>{hero.years}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.course}>
        <View style={styles.courseHead}>
          <Ionicons name="school-outline" size={22} color={colors.primary} />
          <Text style={styles.courseTitle}>{s.courseTitle}</Text>
        </View>
        <Text style={styles.courseText}>{s.courseText}</Text>
        {isAdult ? (
          <Pressable style={styles.courseButton} onPress={() => Linking.openURL(ONLINE_COURSE_URL)}>
            <Text style={styles.courseButtonText}>{s.courseOpen}</Text>
            <Ionicons name="open-outline" size={16} color={colors.white} />
          </Pressable>
        ) : (
          <Text style={styles.courseKid}>{s.courseKid}</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E2226',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  guideBody: { flex: 1 },
  guideTitle: { fontFamily: fonts.hand, fontSize: 28, color: '#5FF2E6' },
  guideText: { color: '#CFEDEA', fontSize: 14, lineHeight: 20, marginTop: 2 },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: '#5FF2E6',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  guideButtonText: { color: '#0E2226', fontWeight: '700' },
  section: { fontFamily: fonts.hand, fontSize: 28, color: colors.text, marginBottom: spacing.sm },
  era: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  eraBadge: { width: 54, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  eraNum: { color: colors.white, fontSize: 11, fontWeight: '700' },
  eraBody: { flex: 1 },
  eraTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  eraYears: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  eraIntro: { fontSize: 13, color: colors.text, marginTop: 3 },
  artists: { gap: spacing.sm, paddingBottom: spacing.lg },
  artist: { width: 100 },
  portrait: { width: 100, height: 124, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  portraitFallback: {
    width: 100,
    height: 124,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistName: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 },
  artistYears: { fontSize: 11, color: colors.textMuted },
  course: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  courseTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  courseText: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  courseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  courseButtonText: { color: colors.white, fontWeight: '700' },
  courseKid: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
});
