import React, { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AnnouncementCard } from '../../components/AnnouncementCard';
import { fetchAnnouncements, AnnouncementWithAuthor } from '../../lib/announcements';
import { colors, spacing } from '../../theme/colors';
import { useStrings } from '../../i18n';

const STRINGS = {
  ru: { empty: 'Объявлений пока нет' },
  kk: { empty: 'Әзірге хабарландырулар жоқ' },
  en: { empty: 'No announcements yet' },
};

export function AnnouncementsScreen() {
  const s = useStrings(STRINGS);
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
      {items.length === 0 && !loading ? <Text style={styles.empty}>{s.empty}</Text> : null}
      {items.map((item) => (
        <AnnouncementCard key={item.id} announcement={item} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
