import React, { useEffect, useLayoutEffect, useState } from 'react';
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
import {
  HEROES,
  HERO_CHANGES_PER_YEAR,
  fetchHeroChangesLeft,
  findHero,
  heroFinalArtUrl,
  heroStory,
  saveHero,
  type Hero,
  type HeroId,
} from '../../lib/heroes';
import type { HeroStage } from '../../lib/heroArt';
import { dismissHeroOnboarding } from '../../lib/heroOnboarding';
import { errorText } from '../../lib/errors';
import { useLanguage, useStrings } from '../../i18n';
import { colors, radius, shadow, spacing } from '../../theme/colors';
import type { StudentStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    title: 'Выбери своего художника',
    intro:
      'Здесь художники такими, какими они станут в конце пути, — великими мастерами. А начнёт твой художник ребёнком, как и ты. Переходишь в новую группу — он взрослеет и открывает новую главу своей истории. Участвуешь в конкурсах — становится сильнее и получает новые облики.',
    choose: (name: string) => `Выбрать: ${name}`,
    pickFirst: 'Нажми на художника, чтобы выбрать',
    later: 'Выберу позже',
    failed: 'Не удалось сохранить художника',
    changesLeft: (n: number, max: number) => `Сменить художника можно ${max} раза в год. В этом году осталось: ${n}.`,
    noChanges: 'В этом году художника больше сменить нельзя. Новые смены появятся 1 января.',
    confirmTitle: 'Сменить художника?',
    confirmText: (n: number) =>
      `После смены останется ${n} ${n === 1 ? 'смена' : 'смены'} в этом году. Опыт, звёзды и огонёк сохранятся.`,
    confirmLast: 'Это последняя смена в этом году. Опыт, звёзды и огонёк сохранятся.',
    confirm: 'Сменить',
    cancel: 'Отмена',
  },
  kk: {
    title: 'Өз суретшіңді таңда',
    intro:
      'Мұнда суретшілер жолдың соңындағыдай — ұлы шеберлер. Ал сенің суретшің сен сияқты баладан бастайды. Жаңа топқа ауыссаң — ол есейіп, өз тарихының жаңа тарауын ашады. Байқауларға қатыссаң — күшейіп, жаңа бейнелер алады.',
    choose: (name: string) => `Таңдау: ${name}`,
    pickFirst: 'Таңдау үшін суретшіні бас',
    later: 'Кейін таңдаймын',
    failed: 'Суретшіні сақтау мүмкін болмады',
    changesLeft: (n: number, max: number) => `Суретшіні жылына ${max} рет ауыстыруға болады. Биыл қалғаны: ${n}.`,
    noChanges: 'Биыл суретшіні бұдан артық ауыстыруға болмайды. Жаңа мүмкіндік 1 қаңтарда ашылады.',
    confirmTitle: 'Суретшіні ауыстыру керек пе?',
    confirmText: (n: number) => `Ауыстырғаннан кейін биыл ${n} мүмкіндік қалады. Тәжірибе, жұлдыздар және от сақталады.`,
    confirmLast: 'Бұл биылғы соңғы ауыстыру. Тәжірибе, жұлдыздар және от сақталады.',
    confirm: 'Ауыстыру',
    cancel: 'Бас тарту',
  },
  en: {
    title: 'Choose your artist',
    intro:
      'Here the artists are shown as they will be at the end of the road: great masters. Your artist starts as a child, just like you. Move up to a new group and your artist grows older and unlocks a new chapter of their story. Take part in competitions and your artist gets stronger and earns new looks.',
    choose: (name: string) => `Choose ${name}`,
    pickFirst: 'Tap an artist to choose',
    later: "I'll choose later",
    failed: 'Could not save your artist',
    changesLeft: (n: number, max: number) => `You can change your artist ${max} times a year. Left this year: ${n}.`,
    noChanges: 'You can’t change your artist again this year. New changes open on January 1.',
    confirmTitle: 'Change your artist?',
    confirmText: (n: number) => `After this you will have ${n} change${n === 1 ? '' : 's'} left this year. XP, stars and streak are kept.`,
    confirmLast: 'This is your last change this year. XP, stars and streak are kept.',
    confirm: 'Change',
    cancel: 'Cancel',
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
  // Смена героя (не первый выбор) ограничена: 3 раза в год.
  const current = (profile?.hero_id as HeroId | null) ?? null;
  const [changesLeft, setChangesLeft] = useState<number | null>(null);
  useEffect(() => {
    if (current) fetchHeroChangesLeft().then(setChangesLeft);
  }, [current]);
  const isChange = !!current && !!selected && selected !== current;
  const blocked = isChange && changesLeft === 0;

  useLayoutEffect(() => {
    navigation.setOptions({ title: s.title });
  }, [navigation, s.title]);

  const save = async () => {
    if (!profile || !selected) return;
    setSaving(true);
    try {
      await saveHero(profile.id, selected);
      await refreshProfile();
      navigation.goBack();
    } catch (e) {
      // Лимит смен проверяет сервер (0061); его текст — со старым словом «герой».
      const limit = (e as { code?: string } | null)?.code === '42501';
      Alert.alert(s.failed, limit ? s.noChanges : errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const onSave = () => {
    if (!isChange) {
      if (selected === current) navigation.goBack();
      else save();
      return;
    }
    if (blocked) return;
    const after = Math.max(0, (changesLeft ?? HERO_CHANGES_PER_YEAR) - 1);
    Alert.alert(s.confirmTitle, after === 0 ? s.confirmLast : s.confirmText(after), [
      { text: s.cancel, style: 'cancel' },
      { text: s.confirm, onPress: save },
    ]);
  };

  const onLater = () => {
    if (profile) dismissHeroOnboarding(profile.id);
    navigation.goBack();
  };


  return (
    <Screen scroll>
      <Text style={styles.intro}>{s.intro}</Text>
      {current && changesLeft !== null ? (
        <View style={[styles.limit, changesLeft === 0 && styles.limitOff]}>
          <Ionicons name={changesLeft === 0 ? 'lock-closed' : 'swap-horizontal'} size={16} color={colors.primary} />
          <Text style={styles.limitText}>
            {changesLeft === 0 ? s.noChanges : s.changesLeft(changesLeft, HERO_CHANGES_PER_YEAR)}
          </Text>
        </View>
      ) : null}
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
        disabled={!hero || blocked}
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
  limit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  limitOff: { backgroundColor: '#FBE9EE' },
  limitText: { flex: 1, color: colors.text, fontSize: 13 },
  later: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
});
