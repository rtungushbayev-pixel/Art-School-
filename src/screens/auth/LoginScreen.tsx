import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { PaintDots } from '../../components/PaintDots';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const STRINGS = {
  ru: {
    fillAll: 'Заполните все поля',
    loginFailed: 'Не удалось войти',
    school: 'Школа искусств и дизайна',
    schoolName: 'им. А. Кастеева',
    password: 'Пароль',
    signIn: 'Войти',
    noAccount: 'Нет аккаунта?',
    signUp: 'Зарегистрироваться',
  },
  kk: {
    fillAll: 'Барлық өрістерді толтырыңыз',
    loginFailed: 'Кіру мүмкін болмады',
    school: 'Өнер және дизайн мектебі',
    schoolName: 'Ә. Қастеев атындағы',
    password: 'Құпиясөз',
    signIn: 'Кіру',
    noAccount: 'Аккаунтыңыз жоқ па?',
    signUp: 'Тіркелу',
  },
  en: {
    fillAll: 'Please fill in all fields',
    loginFailed: 'Could not sign in',
    school: 'School of Art and Design',
    schoolName: 'named after A. Kasteyev',
    password: 'Password',
    signIn: 'Sign in',
    noAccount: 'No account?',
    signUp: 'Sign up',
  },
};

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const s = useStrings(STRINGS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert(s.fillAll);
      return;
    }
    setLoading(true);
    const error = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert(s.loginFailed, error);
    }
  };

  return (
    <Screen scroll>
      <LanguageSwitcher compact />
      <View style={styles.header}>
        <PaintDots />
        <Text style={styles.title}>{s.school}</Text>
        <Text style={styles.subtitle}>{s.schoolName}</Text>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField
        label={s.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      <Button title={s.signIn} onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{s.noAccount}</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
          {' '}
          {s.signUp}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, marginBottom: spacing.xl, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, textAlign: 'center', marginTop: spacing.md },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
