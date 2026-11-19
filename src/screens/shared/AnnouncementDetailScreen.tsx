import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { isStaffRole } from '../../lib/roles';
import { fetchAnnouncement, type AnnouncementWithAuthor } from '../../lib/announcements';
import { useStrings, useLanguage } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { StaffStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: { administration: 'Администрация', edit: 'Редактировать', notFound: 'Сообщение удалено' },
  kk: { administration: 'Әкімшілік', edit: 'Өңдеу', notFound: 'Хабарлама жойылған' },
  en: { administration: 'Administration', edit: 'Edit', notFound: 'The message was deleted' },
};

// Сообщение целиком: крупный текст, который можно выделить и скопировать.
export function AnnouncementDetailScreen() {
  const s = useStrings(STRINGS);
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const route = useRoute<RouteProp<StaffStackParamList, 'AnnouncementDetail'>>();
  const [item, setItem] = useState<AnnouncementWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItem(await fetchAnnouncement(route.params.announcementId));
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, [route.params.announcementId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!item) {
    return <Screen>{loading ? null : <Text style={styles.meta}>{s.notFound}</Text>}</Screen>;
  }

  const date = new Date(item.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.title} selectable>
        {item.pinned ? '📌 ' : ''}
        {item.title}
      </Text>
      <Text style={styles.meta}>
        {item.author?.full_name ?? s.administration} · {date}
      </Text>
      <Text style={styles.body} selectable>
        {item.body}
      </Text>
      {isStaffRole(profile?.role) ? (
        <View style={styles.edit}>
          <Button
            title={s.edit}
            variant="secondary"
            onPress={() => navigation.navigate('ComposeAnnouncement', { announcementId: item.id })}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  meta: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  body: { fontSize: 17, lineHeight: 26, color: colors.text },
  edit: { marginTop: spacing.lg },
});
