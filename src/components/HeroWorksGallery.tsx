import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLanguage, useStrings } from '../i18n';
import { heroWorks } from '../lib/heroWorks';
import type { HeroId } from '../lib/heroes';
import { colors, radius, shadow, spacing } from '../theme/colors';
import { fonts } from '../theme/fonts';

const STRINGS = {
  ru: { title: 'Знаменитые картины', hint: 'Нажми на картину, чтобы рассмотреть. Общественное достояние, Wikimedia Commons.' },
  kk: { title: 'Әйгілі суреттер', hint: 'Суретті үлкейту үшін бас. Қоғамдық игілік, Wikimedia Commons.' },
  en: { title: 'Famous paintings', hint: 'Tap a painting to look closer. Public domain, Wikimedia Commons.' },
};

// Горизонтальная лента знаменитых картин героя с просмотром на весь экран.
export function HeroWorksGallery({ heroId, titleStyle }: { heroId: HeroId; titleStyle?: object }) {
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const works = heroWorks(heroId, lang);
  const [open, setOpen] = useState<number | null>(null);
  if (works.length === 0) return null;
  const current = open !== null ? works[open] : null;

  return (
    <>
      <Text style={[styles.title, titleStyle]}>{s.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {works.map((w, i) => (
          <Pressable key={i} style={styles.item} onPress={() => setOpen(i)}>
            <View style={styles.frame}>
              <Image source={w.image} style={styles.image} contentFit="cover" />
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {w.title}
            </Text>
            <Text style={styles.year}>{w.year}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.hint}>{s.hint}</Text>
      <Modal visible={current !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.viewer} onPress={() => setOpen(null)}>
          {current ? (
            <>
              <Image source={current.image} style={styles.viewerImage} contentFit="contain" />
              <Text style={styles.viewerCaption}>
                {current.title}, {current.year}
              </Text>
            </>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.hand, fontSize: 32, lineHeight: 38, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { gap: spacing.sm, paddingRight: spacing.sm },
  item: { width: 196 },
  frame: { backgroundColor: colors.accent, padding: 4, borderRadius: radius.md, ...shadow.soft },
  image: { width: 188, height: 140, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  name: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 6 },
  year: { fontSize: 11, color: colors.textMuted },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  viewerImage: { width: '100%', height: '75%' },
  viewerCaption: { color: colors.white, marginTop: spacing.md, textAlign: 'center', fontSize: 15 },
});
