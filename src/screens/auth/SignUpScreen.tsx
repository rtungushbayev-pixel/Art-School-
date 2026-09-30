import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Заполните все поля');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Пароль должен быть не короче 6 символов');
      return;
    }
    setLoading(true);
    const error = await signUp({ email: email.trim(), password, fullName: fullName.trim() });
    setLoading(false);
    if (error) {
      Alert.alert('Не удалось зарегистрироваться', error);
    } else {
      Alert.alert(
        'Готово',
        'Проверьте почту для подтверждения аккаунта (если это требуется настройками проекта), затем войдите.'
      );
      navigation.navigate('Login');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Регистрация</Text>

      <TextField label="Полное имя" value={fullName} onChangeText={setFullName} placeholder="Иванов Иван" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField label="Пароль" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

      <Text style={styles.hint}>
        Все регистрируются как ученики. Преподавателям и сотрудникам роль назначает администрация школы.
      </Text>

      <Button title="Зарегистрироваться" onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Уже есть аккаунт?</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          {' '}
          Войти
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.lg },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
