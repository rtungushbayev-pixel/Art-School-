import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { MAX_FEATURED_WORKS, parseYear, setPostFeatured, updateArtworkDetails } from '../../lib/portfolio';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { Post } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STRINGS = {
  ru: {
    loading: 'Загрузка…',
    checkYear: 'Проверьте год',
    yearHint: 'Укажите год четырьмя цифрами, например 2026.',
    tooManyFeatured: 'Слишком много избранных',
    tooManyFeaturedText: (max: number) =>
      `В начале портфолио можно закрепить до ${max} работ. Снимите отметку с другой работы.`,
    saveFailed: 'Не удалось сохранить',
    titleLabel: 'Название',
    titlePlaceholder: 'Например: «Осенний этюд»',
    technique: 'Техника и материалы',
    techniquePlaceholder: 'Например: акварель, бумага',
    year: 'Год создания',
    caption: 'Подпись',
    featured: 'Избранная работа',
    featuredHint: 'Показывается первой в портфолио',
    remoderation:
      'После изменения названия, техники или подписи работа снова пройдёт модерацию и временно пропадёт из ленты.',
    save: 'Сохранить',
  },
  kk: {
    loading: 'Жүктелуде…',
    checkYear: 'Жылды тексеріңіз',
    yearHint: 'Жылды төрт цифрмен көрсетіңіз, мысалы 2026.',
    tooManyFeatured: 'Таңдаулылар тым көп',
    tooManyFeaturedText: (max: number) =>
      `Портфолионың басында ${max} жұмысқа дейін бекітуге болады. Басқа жұмыстан белгіні алып тастаңыз.`,
    saveFailed: 'Сақтау мүмкін болмады',
    titleLabel: 'Атауы',
    titlePlaceholder: 'Мысалы: «Күзгі этюд»',
    technique: 'Техника және материалдар',
    techniquePlaceholder: 'Мысалы: акварель, қағаз',
    year: 'Жасалған жылы',
    caption: 'Сипаттама',
    featured: 'Таңдаулы жұмыс',
    featuredHint: 'Портфолиода бірінші көрсетіледі',
    remoderation:
      'Атауын, техникасын немесе сипаттамасын өзгерткеннен кейін жұмыс қайтадан модерациядан өтеді және таспадан уақытша жоғалады.',
    save: 'Сақтау',
  },
  en: {
    loading: 'Loading…',
    checkYear: 'Check the year',
    yearHint: 'Enter the year as four digits, e.g. 2026.',
    tooManyFeatured: 'Too many featured works',
    tooManyFeaturedText: (max: number) =>
      `You can pin up to ${max} works at the top of your portfolio. Unmark another work first.`,
    saveFailed: 'Could not save',
    titleLabel: 'Title',
    titlePlaceholder: 'E.g. “Autumn study”',
    technique: 'Technique and materials',
    techniquePlaceholder: 'E.g. watercolor, paper',
    year: 'Year created',
    caption: 'Caption',
    featured: 'Featured work',
    featuredHint: 'Shown first in the portfolio',
    remoderation:
      'After you change the title, technique or caption, the work will go through moderation again and temporarily disappear from the feed.',
    save: 'Save',
  },
};

// Автор правит сведения о своей работе для портфолио.
export function EditArtworkScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<NavParamList, 'EditArtwork'>>();
  const { postId } = route.params;
  const s = useStrings(STRINGS);

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [technique, setTechnique] = useState('');
  const [year, setYear] = useState('');
  const [caption, setCaption] = useState('');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as Post;
        setPost(row);
        setTitle(row.title ?? '');
        setTechnique(row.technique ?? '');
        setYear(row.artwork_year ? String(row.artwork_year) : '');
        setCaption(row.caption ?? '');
        setFeatured(row.featured);
      });
  }, [postId]);

  if (!post) {
    return (
      <Screen>
        <Text style={styles.muted}>{s.loading}</Text>
      </Screen>
    );
  }

  const textChanged =
    (title.trim() || null) !== post.title ||
    (technique.trim() || null) !== post.technique ||
    (caption.trim() || null) !== post.caption;

  const onSave = async () => {
    const artworkYear = parseYear(year);
    if (artworkYear === 'invalid') {
      Alert.alert(s.checkYear, s.yearHint);
      return;
    }

    setSaving(true);
    try {
      if (featured && !post.featured) {
        const { count } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', post.author_id)
          .eq('featured', true);
        if ((count ?? 0) >= MAX_FEATURED_WORKS) {
          Alert.alert(s.tooManyFeatured, s.tooManyFeaturedText(MAX_FEATURED_WORKS));
          return;
        }
      }

      await updateArtworkDetails(post.id, {
        title: title.trim() || null,
        technique: technique.trim() || null,
        caption: caption.trim() || null,
        artwork_year: artworkYear,
      });
      if (featured !== post.featured) {
        await setPostFeatured(post.id, featured);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(s.saveFailed, e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <TextField label={s.titleLabel} placeholder={s.titlePlaceholder} value={title} onChangeText={setTitle} />
      <TextField
        label={s.technique}
        placeholder={s.techniquePlaceholder}
        value={technique}
        onChangeText={setTechnique}
      />
      <TextField
        label={s.year}
        placeholder={String(new Date().getFullYear())}
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
        maxLength={4}
      />
      <TextField label={s.caption} value={caption} onChangeText={setCaption} multiline />

      <Card style={styles.featuredRow}>
        <View style={styles.featuredText}>
          <Text style={styles.featuredTitle}>{s.featured}</Text>
          <Text style={styles.muted}>{s.featuredHint}</Text>
        </View>
        <Switch
          value={featured}
          onValueChange={setFeatured}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={featured ? colors.primary : colors.white}
          ios_backgroundColor={colors.border}
        />
      </Card>

      {textChanged && post.status !== 'pending' ? (
        <Text style={styles.warning}>{s.remoderation}</Text>
      ) : null}

      <Button title={s.save} onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13 },
  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featuredText: { flex: 1 },
  featuredTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  warning: { color: colors.warning, marginBottom: spacing.md },
});
