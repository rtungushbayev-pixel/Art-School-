import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { HeroWorksGallery } from '../../components/HeroWorksGallery';
import { HeroAvatar } from '../../components/HeroAvatar';
import { findHero, heroPhoto, heroStory } from '../../lib/heroes';
import { speak, stopSpeaking } from '../../lib/artGuide';
import { pick, useLanguage, useStrings } from '../../i18n';
import { portraitCaption } from '../../lib/contentI18n';
import { colors, radius, spacing } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

// Страница художника: те же 14 мастеров, что и герои учеников.
// Биография — 10 глав из историй героев, от детства до мастерства.

const STRINGS = {
  ru: {
    life: 'Жизнь художника',
    listen: 'Послушать',
    stop: 'Остановить',
    ask: 'Спросить гида об этом художнике',
    portraits: 'Автопортреты разных лет (общественное достояние, Wikimedia Commons)',
    kasteyev: 'Картины Кастеева можно увидеть в Государственном музее искусств РК им. А. Кастеева в Алматы.',
    notFound: 'Художник не найден',
  },
  kk: {
    life: 'Суретшінің өмірі',
    listen: 'Тыңдау',
    stop: 'Тоқтату',
    ask: 'Гидтен осы суретші туралы сұрау',
    portraits: 'Әр жылдардағы автопортреттер (қоғамдық игілік, Wikimedia Commons)',
    kasteyev: 'Қастеевтің суреттерін Алматыдағы Ә. Қастеев атындағы ҚР Мемлекеттік өнер музейінен көруге болады.',
    notFound: 'Суретші табылмады',
  },
  en: {
    life: "The artist's life",
    listen: 'Listen',
    stop: 'Stop',
    ask: 'Ask the guide about this artist',
    portraits: 'Self-portraits over the years (public domain, Wikimedia Commons)',
    kasteyev: "Kasteyev's paintings are in the A. Kasteyev State Museum of Arts in Almaty.",
    notFound: 'Artist not found',
  },
};

export function ArtArtistScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const hero = findHero(route.params?.heroId);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (hero) navigation.setOptions({ title: pick(hero.name, lang) });
  }, [hero, lang, navigation]);

  useFocusEffect(
    React.useCallback(() => () => {
      stopSpeaking();
      setSpeaking(false);
    }, [])
  );

  if (!hero) {
    return (
      <Screen>
        <Text style={styles.text}>{s.notFound}</Text>
      </Screen>
    );
  }

  const story = heroStory(hero.id, lang);
  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(story.join(' '), lang === 'kk' ? 'kk' : 'ru', { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
  };

  return (
    <Screen scroll>
      <View style={styles.head}>
        {heroPhoto(hero) ? (
          <Image source={heroPhoto(hero)} style={styles.headPhoto} contentFit="cover" contentPosition="top" />
        ) : (
          <HeroAvatar hero={hero} stage={5} size={96} />
        )}
        <View style={styles.headBody}>
          <Text style={styles.name}>{pick(hero.name, lang)}</Text>
          <Text style={styles.years}>{hero.years}</Text>
          <Text style={styles.tagline}>{pick(hero.tagline, lang)}</Text>
        </View>
      </View>

      {hero.portraits?.length ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portraits}>
            {hero.portraits.map((p, i) => (
              <View key={i} style={styles.portraitBox}>
                <Image source={p.image} style={styles.portrait} contentFit="cover" />
                <Text style={styles.caption}>{portraitCaption(p.caption, lang)}</Text>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.credit}>{s.portraits}</Text>
        </>
      ) : null}
      {hero.id === 'kasteyev' ? <Text style={styles.note}>{s.kasteyev}</Text> : null}
      <HeroWorksGallery heroId={hero.id} />

      <View style={styles.lifeHead}>
        <Text style={styles.section}>{s.life}</Text>
        <Pressable style={styles.listen} onPress={toggle}>
          <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-high-outline'} size={18} color={colors.primary} />
          <Text style={styles.listenText}>{speaking ? s.stop : s.listen}</Text>
        </Pressable>
      </View>
      {story.map((p, i) => (
        <View key={i} style={styles.chapter}>
          <Text style={styles.chapterNum}>{i + 1}</Text>
          <Text style={[styles.text, styles.chapterText]}>{p}</Text>
        </View>
      ))}

      <Pressable style={styles.ask} onPress={() => navigation.navigate('AskGuide', { heroId: hero.id })}>
        <Ionicons name="chatbubbles-outline" size={18} color="#0E2226" />
        <Text style={styles.askText}>{s.ask}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headBody: { flex: 1 },
  name: { fontFamily: fonts.hand, fontSize: 30, color: colors.text },
  years: { fontSize: 13, color: colors.textMuted },
  tagline: { fontSize: 14, color: colors.text, marginTop: 4 },
  portraits: { gap: spacing.sm },
  portraitBox: { width: 130 },
  headPhoto: { width: 96, height: 120, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  portrait: { width: 130, height: 160, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  caption: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  credit: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm },
  note: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: spacing.sm, fontStyle: 'italic' },
  lifeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  section: { fontFamily: fonts.hand, fontSize: 28, color: colors.text, marginBottom: spacing.sm },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listenText: { color: colors.primary, fontWeight: '700' },
  chapter: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chapterNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    textAlign: 'center',
    lineHeight: 26,
    color: colors.primary,
    fontWeight: '700',
    overflow: 'hidden',
  },
  chapterText: { flex: 1 },
  text: { fontSize: 16, lineHeight: 24, color: colors.text },
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
