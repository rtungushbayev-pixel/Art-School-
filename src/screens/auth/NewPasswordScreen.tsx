import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    title: 'Новый пароль',
    hint: 'Придумайте новый пароль для входа в приложение.',
    password: 'Новый пароль',
    repeat: 'Повторите пароль',
    save: 'Сохранить пароль',
    tooShort: 'Пароль должен быть не короче 8 символов',
    mismatch: 'Пароли не совпадают',
    failed: 'Не удалось сменить пароль',
    done: 'Пароль изменён',
  },
  kk: {
    title: 'Жаңа құпиясөз',
    hint: 'Қолданбаға кіру үшін жаңа құпиясөз ойлап табыңыз.',
    password: 'Жаңа құпиясөз',
    repeat: 'Құпиясөзді қайталаңыз',
    save: 'Құпиясөзді сақтау',
    tooShort: 'Құпиясөз кемінде 8 таңбадан тұруы керек',
    mismatch: 'Құпиясөздер сәйкес келмейді',
    failed: 'Құпиясөзді өзгерту мүмкін болмады',
    done: 'Құпиясөз өзгертілді',
  },
  en: {
    title: 'New password',
    hint: 'Choose a new password for signing in to the app.',
    password: 'New password',
    repeat: 'Repeat password',
    save: 'Save password',
    tooShort: 'The password must be at least 8 characters',
    mismatch: 'Passwords do not match',
    failed: 'Could not change the password',
    done: 'Password changed',
  },
};

// Открывается после перехода по ссылке «Сбросить пароль» из письма.
export function NewPasswordScreen() {
  const { updatePassword } = useAuth();
  const s = useStrings(STRINGS);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (password.length < 8) {
      Alert.alert(s.tooShort);
      return;
    }
    if (password !== repeat) {
      Alert.alert(s.mismatch);
      return;
    }
    setLoading(true);
    const error = await updatePassword(password);
    setLoading(false);
    if (error) Alert.alert(s.failed, error);
    else Alert.alert(s.done);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.hint}>{s.hint}</Text>
      <TextField label={s.password} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      <TextField label={s.repeat} value={repeat} onChangeText={setRepeat} secureTextEntry placeholder="••••••••" />
      <Button title={s.save} onPress={onSave} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { color: colors.textMuted, marginBottom: spacing.lg },
});
