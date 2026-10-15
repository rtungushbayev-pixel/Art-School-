import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import type { StoryGroup } from '../lib/stories';
import type { Profile } from '../types/database';
import { useStrings } from '../i18n';
import { colors, paint, spacing } from '../theme/colors';

const STRINGS = {
  ru: { yourStory: 'Ваша история' },
  kk: { yourStory: 'Сіздің оқиғаңыз' },
  en: { yourStory: 'Your story' },
};

const SIZE = 64;

interface Props {
  viewer: Profile;
  groups: StoryGroup[];
  canPost: boolean;
  uploading: boolean;
  onAdd: () => void;
  onOpen: (index: number) => void;
}

// Кружки сторис над лентой: первым — свой (с «+»), дальше — люди с живыми сторис.
// Цветное кольцо — есть непросмотренные, серое — всё просмотрено.
export function StoriesRow({ viewer, groups, canPost, uploading, onAdd, onOpen }: Props) {
  const s = useStrings(STRINGS);
  const ownIndex = groups.findIndex((g) => g.author.id === viewer.id);
  const others = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.author.id !== viewer.id);
  if (!canPost && others.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {canPost ? (
        <Pressable style={styles.item} onPress={() => (ownIndex >= 0 ? onOpen(ownIndex) : onAdd())}>
          <View style={[styles.ring, ownIndex >= 0 ? styles.ringOwn : styles.ringNone]}>
            <Avatar uri={viewer.avatar_url} name={viewer.full_name} size={SIZE} />
            {uploading ? (
              <View style={styles.uploading}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
          </View>
          <Pressable style={styles.plus} onPress={onAdd} hitSlop={8}>
            <Ionicons name="add" size={16} color={colors.white} />
          </Pressable>
          <Text style={styles.name} numberOfLines={1}>
            {s.yourStory}
          </Text>
        </Pressable>
      ) : null}
      {others.map(({ g, i }) => (
        <Pressable key={g.author.id} style={styles.item} onPress={() => onOpen(i)}>
          <View style={[styles.ring, g.allSeen ? styles.ringSeen : styles.ringNew]}>
            <Avatar uri={g.author.avatar_url} name={g.author.full_name} size={SIZE} />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {g.author.full_name.split(' ')[0]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -spacing.md, marginBottom: spacing.md },
  row: { paddingHorizontal: spacing.md, gap: spacing.md },
  item: { width: SIZE + 10, alignItems: 'center' },
  ring: { padding: 2, borderRadius: (SIZE + 8) / 2, borderWidth: 2 },
  ringNew: { borderColor: paint.violet },
  ringSeen: { borderColor: colors.border },
  ringOwn: { borderColor: colors.border },
  ringNone: { borderColor: 'transparent' },
  uploading: {
    ...StyleSheet.absoluteFill,
    margin: 2,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  plus: {
    position: 'absolute',
    top: SIZE - 14,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  name: { marginTop: 4, fontSize: 12, color: colors.text, maxWidth: SIZE + 10, textAlign: 'center' },
});
