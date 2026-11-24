import React, { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { HeroAvatar } from '../../components/HeroAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useHero } from '../../hooks/useHero';
import { HEROES, findHero, heroFinalArtUrl, heroStory, saveHero, type Hero, type HeroId } from '../../lib/heroes';
import type { HeroStage } from '../../lib/heroArt';
import { dismissHeroOnboarding } from '../../lib/heroOnboarding';
import { errorText } from '../../lib/errors';
import { useLanguage, useStrings } from '../../i18n';
import { colors, radius, shadow, spacing } from '../../theme/colors';
import type { StudentStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    title: 'Выбери своего героя',
    intro:
      'Здесь герои такими, какими они станут в конце пути, — великими мастерами. А начнёт твой герой ребёнком, как и ты. Переходишь в новую группу — он взрослеет и открывает новую главу своей истории. Участвуешь в конкурсах — становится сильнее и получает новые облики.',
    choose: (name: string) => `Выбрать: ${name}`,
    pickFirst: 'Нажми на героя, чтобы выбрать',
    later: 'Выберу позже',
    failed: 'Не удалось сохранить героя',
  },
  kk: {
    title: 'Өз кейіпкеріңді таңда',
    intro:
      'Мұнда кейіпкерлер жолдың соңындағыдай — ұлы шеберлер. Ал сенің кейіпкерің сен сияқты баладан бастайды. Жаңа топқа ауыссаң — ол есейіп, өз тарихының жаңа тарауын ашады. Байқауларға қатыссаң — күшейіп, жаңа бейнелер алады.',
    choose: (name: string) => `Таңдау: ${name}`,
    pickFirst: 'Таңдау үшін кейіпкерді бас',
    later: 'Кейін таңдаймын',
    failed: 'Кейіпкерді сақтау мүмкін болмады',
  },
  en: {
    title: 'Choose your hero',
    intro:
      'Here the heroes are shown as they will be at the end of the road: great masters. Your hero starts as a child, just like you. Move up to a new group and your hero grows older and unlocks a new chapter of their story. Take part in competitions and your hero gets stronger and earns new looks.',
    choose: (name: string) => `Choose ${name}`,
    pickFirst: 'Tap a hero to choose',
    later: "I'll choose later",
    failed: 'Could not save your hero',
  },
};

export function HeroPickerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute<RouteProp<StudentStackParamList, 'HeroPicker'>>();
  const onboarding = route.params?.onboarding ?? false;
  const { profile, refreshProfile } = useAuth();
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const { stage } = useHero(profile);
  const [selected, setSelected] = useState<HeroId | null>((profile?.hero_id as HeroId | null) ?? null);
  const [saving, setSaving] = useState(false);
  const hero = findHero(selected);

  useLayoutEffect(() => {
    navigation.setOptions({ title: s.title });
  }, [navigation, s.title]);

  const onSave = async () => {
    if (!profile || !selected) return;
    setSaving(true);
    try {
      await saveHero(profile.id, selected);
      await refreshProfile();
      navigation.goBack();
    } catch (e) {
      Alert.alert(s.failed, errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const onLater = () => {
    if (profile) dismissHeroOnboarding(profile.id);
    navigation.goBack();
  };


  return (
    <Screen scroll>
      <Text style={styles.intro}>{s.intro}</Text>
      <View style={styles.grid}>
        {HEROES.map((h) => {
          const active = h.id === selected;
          return (
            <Pressable
              key={h.id}
              onPress={() => setSelected(h.id)}
              style={[styles.tile, active && styles.tileActive]}
              accessibilityState={{ selected: active }}
            >
              <MasterArt hero={h} stage={stage} />
              <Text style={styles.tileName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                {h.name[lang] ?? h.name.ru}
              </Text>
              <Text style={styles.tileYears}>{h.years}</Text>
              {active ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {hero ? (
        <View style={styles.preview}>
          <Text style={styles.previewName}>{hero.name[lang] ?? hero.name.ru}</Text>
          <Text style={styles.previewTagline}>{hero.tagline[lang] ?? hero.tagline.ru}</Text>
          <Text style={styles.previewStory}>{heroStory(hero.id, lang)[0]}</Text>
        </View>
      ) : null}

      <Button
        title={hero ? s.choose(hero.name[lang] ?? hero.name.ru) : s.pickFirst}
        onPress={onSave}
        loading={saving}
        disabled={!hero}
      />
      {onboarding ? (
        <Text style={styles.later} onPress={onLater}>
          {s.later}
        </Text>
      ) : null}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

// Герой на последнем этапе (10 уровень, обычный облик) из Storage.
// Пока картинка не загрузилась или её нет — рисованный аватар.
function MasterArt({ hero, stage }: { hero: Hero; stage: HeroStage }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <HeroAvatar hero={hero} stage={stage} size={112} />;
  return (
    <Image
      source={{ uri: heroFinalArtUrl(hero.id) }}
      style={styles.art}
      contentFit="contain"
      transition={200}
      cachePolicy="disk"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  art: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: '#F3EBDD' },
  intro: { color: colors.text, lineHeight: 21, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  tile: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadow.soft,
  },
  tileActive: { borderColor: colors.primary, backgroundColor: '#FBF1F2' },
  tileName: { fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  tileYears: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  check: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  previewName: { fontSize: 18, fontWeight: '800', color: colors.primary },
  previewTagline: { color: colors.textMuted, marginTop: 2 },
  previewStory: { color: colors.text, marginTop: spacing.sm, lineHeight: 21 },
  later: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
});
