import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AnnouncementCard } from '../../components/AnnouncementCard';
import { fetchAnnouncements, AnnouncementWithAuthor } from '../../lib/announcements';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

export function StaffAnnouncementsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [items, setItems] = useState<AnnouncementWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAnnouncements());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>Объявления</Text>
      <Pressable style={styles.createButton} onPress={() => navigation.navigate('ComposeAnnouncement')}>
        <Text style={styles.createButtonText}>+ Новое объявление</Text>
      </Pressable>

      {items.length === 0 && !loading ? <Text style={styles.empty}>Объявлений пока нет</Text> : null}
      {items.map((item) => (
        <AnnouncementCard key={item.id} announcement={item} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createButtonText: { color: colors.white, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
