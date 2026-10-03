import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { TextField } from './TextField';
import { Button } from './Button';
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
    password: 'Введите пароль, чтобы подтвердить удаление',
    wrongPassword: 'Неверный пароль',
    confirmDelete: 'Удалить навсегда',
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
    password: 'Жоюды растау үшін құпиясөзді енгізіңіз',
    wrongPassword: 'Құпиясөз қате',
    confirmDelete: 'Біржола жою',
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
    password: 'Enter your password to confirm deletion',
    wrongPassword: 'Wrong password',
    confirmDelete: 'Delete forever',
  },
};

// Удаление своего аккаунта через функцию delete-account (нужно для App Store
// и Google Play). Двойное подтверждение, потому что действие необратимо.
export function DeleteAccountButton() {
  const s = useStrings(STRINGS);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState('');

  // Перед удалением — повторный вход паролем (сервер требует свежий вход).
  const remove = async () => {
    setBusy(true);
    const { data: current } = await supabase.auth.getSession();
    const email = current.session?.user.email;
    const { error: authError } = email
      ? await supabase.auth.signInWithPassword({ email, password })
      : { error: new Error('no email') };
    if (authError) {
      setBusy(false);
      Alert.alert(s.wrongPassword);
      return;
    }
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
            { text: s.delete, style: 'destructive', onPress: () => setAsking(true) },
          ]),
      },
    ]);

  if (asking) {
    return (
      <View style={styles.confirm}>
        <TextField label={s.password} value={password} onChangeText={setPassword} secureTextEntry autoFocus />
        <Button title={s.confirmDelete} variant="danger" onPress={remove} loading={busy} disabled={!password} />
        <Text style={styles.cancel} onPress={() => setAsking(false)}>
          {s.cancel}
        </Text>
      </View>
    );
  }

  return (
    <Text style={[styles.link, busy && styles.busy]} onPress={busy ? undefined : onPress}>
      {s.button}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.danger, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.md, fontWeight: '600' },
  busy: { opacity: 0.5 },
  confirm: { marginTop: spacing.lg },
  cancel: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.md },
});
