import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { AnnouncementCard } from '../../components/AnnouncementCard';
import { fetchAnnouncements, AnnouncementWithAuthor } from '../../lib/announcements';
import { colors, spacing } from '../../theme/colors';
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
      <Button title="+ Новое объявление" onPress={() => navigation.navigate('ComposeAnnouncement')} />
      <View style={{ height: spacing.md }} />

      {items.length === 0 && !loading ? <Text style={styles.empty}>Объявлений пока нет</Text> : null}
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => navigation.navigate('ComposeAnnouncement', { announcementId: item.id })}>
          <AnnouncementCard announcement={item} editable />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
