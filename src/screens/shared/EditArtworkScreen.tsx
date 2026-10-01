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
import { colors, spacing } from '../../theme/colors';
import type { Post } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

// Автор правит сведения о своей работе для портфолио.
export function EditArtworkScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<NavParamList, 'EditArtwork'>>();
  const { postId } = route.params;

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
        <Text style={styles.muted}>Загрузка…</Text>
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
      Alert.alert('Проверьте год', 'Укажите год четырьмя цифрами, например 2026.');
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
          Alert.alert(
            'Слишком много избранных',
            `В начале портфолио можно закрепить до ${MAX_FEATURED_WORKS} работ. Снимите отметку с другой работы.`
          );
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
      Alert.alert('Не удалось сохранить', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <TextField label="Название" placeholder="Например: «Осенний этюд»" value={title} onChangeText={setTitle} />
      <TextField
        label="Техника и материалы"
        placeholder="Например: акварель, бумага"
        value={technique}
        onChangeText={setTechnique}
      />
      <TextField
        label="Год создания"
        placeholder={String(new Date().getFullYear())}
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
        maxLength={4}
      />
      <TextField label="Подпись" value={caption} onChangeText={setCaption} multiline />

      <Card style={styles.featuredRow}>
        <View style={styles.featuredText}>
          <Text style={styles.featuredTitle}>Избранная работа</Text>
          <Text style={styles.muted}>Показывается первой в портфолио</Text>
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
        <Text style={styles.warning}>
          После изменения названия, техники или подписи работа снова пройдёт модерацию и временно
          пропадёт из ленты.
        </Text>
      ) : null}

      <Button title="Сохранить" onPress={onSave} loading={saving} />
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
