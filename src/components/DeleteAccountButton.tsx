import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import { useStrings } from '../i18n';
import { colors, spacing } from '../theme/colors';

const STRINGS = {
  ru: {
    button: 'Удалить аккаунт',
    title: 'Удалить аккаунт?',
    text: 'Будут удалены ваш профиль, публикации, комментарии, друзья, обращения и загруженные фото. Восстановить их будет нельзя.',
    confirmTitle: 'Точно удалить?',
    confirmText: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    delete: 'Удалить',
    failed: 'Не удалось удалить аккаунт. Проверьте интернет и попробуйте ещё раз.',
  },
  kk: {
    button: 'Аккаунтты жою',
    title: 'Аккаунтты жою керек пе?',
    text: 'Профиліңіз, жарияланымдарыңыз, пікірлеріңіз, достарыңыз, өтініштеріңіз және жүктелген фотолар жойылады. Оларды қалпына келтіру мүмкін болмайды.',
    confirmTitle: 'Шынымен жою керек пе?',
    confirmText: 'Бұл әрекетті болдырмау мүмкін емес.',
    cancel: 'Бас тарту',
    delete: 'Жою',
    failed: 'Аккаунтты жою мүмкін болмады. Интернетті тексеріп, қайталап көріңіз.',
  },
  en: {
    button: 'Delete account',
    title: 'Delete account?',
    text: 'Your profile, posts, comments, friends, requests and uploaded photos will be deleted. They cannot be restored.',
    confirmTitle: 'Are you sure?',
    confirmText: 'This cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    failed: 'Could not delete the account. Check your internet connection and try again.',
  },
};

// Удаление своего аккаунта через функцию delete-account (нужно для App Store
// и Google Play). Двойное подтверждение, потому что действие необратимо.
export function DeleteAccountButton() {
  const s = useStrings(STRINGS);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    setBusy(false);
    if (error) {
      Alert.alert(s.failed);
      return;
    }
    // Аккаунта на сервере уже нет — просто забываем сессию на телефоне.
    await supabase.auth.signOut({ scope: 'local' });
  };

  const onPress = () =>
    Alert.alert(s.title, s.text, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: () =>
          Alert.alert(s.confirmTitle, s.confirmText, [
            { text: s.cancel, style: 'cancel' },
            { text: s.delete, style: 'destructive', onPress: remove },
          ]),
      },
    ]);

  return (
    <Text style={[styles.link, busy && styles.busy]} onPress={busy ? undefined : onPress}>
      {s.button}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.danger, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.md, fontWeight: '600' },
  busy: { opacity: 0.5 },
});
