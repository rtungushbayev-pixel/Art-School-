import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const STRINGS = {
  ru: {
    title: 'Восстановление пароля',
    hint: 'Введите почту, с которой вы регистрировались. Мы пришлём ссылку для смены пароля.',
    send: 'Отправить ссылку',
    enterEmail: 'Введите email',
    failed: 'Не удалось отправить письмо',
    sentTitle: 'Письмо отправлено',
    sent: (email: string) =>
      `Проверьте почту ${email}. Откройте ссылку из письма на этом телефоне и задайте новый пароль. Если письма нет, загляните в «Спам».`,
    back: 'Вернуться ко входу',
  },
  kk: {
    title: 'Құпиясөзді қалпына келтіру',
    hint: 'Тіркелген поштаңызды енгізіңіз. Құпиясөзді өзгертуге арналған сілтеме жібереміз.',
    send: 'Сілтеме жіберу',
    enterEmail: 'Email енгізіңіз',
    failed: 'Хат жіберу мүмкін болмады',
    sentTitle: 'Хат жіберілді',
    sent: (email: string) =>
      `${email} поштасын тексеріңіз. Хаттағы сілтемені осы телефонда ашып, жаңа құпиясөз орнатыңыз. Хат келмесе, «Спам» бумасын қараңыз.`,
    back: 'Кіру бетіне оралу',
  },
  en: {
    title: 'Reset password',
    hint: 'Enter the email you signed up with. We will send you a link to change your password.',
    send: 'Send link',
    enterEmail: 'Enter your email',
    failed: 'Could not send the email',
    sentTitle: 'Email sent',
    sent: (email: string) =>
      `Check ${email}. Open the link from the email on this phone and set a new password. If you don't see it, check your spam folder.`,
    back: 'Back to sign in',
  },
};

export function ForgotPasswordScreen({ navigation }: Props) {
  const { requestPasswordReset } = useAuth();
  const s = useStrings(STRINGS);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(s.enterEmail);
      return;
    }
    setLoading(true);
    const error = await requestPasswordReset(trimmed);
    setLoading(false);
    if (error) {
      Alert.alert(s.failed, error);
      return;
    }
    Alert.alert(s.sentTitle, s.sent(trimmed));
    navigation.navigate('Login');
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.hint}>{s.hint}</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        autoFocus
      />
      <Button title={s.send} onPress={onSubmit} loading={loading} />
      <View style={styles.footer}>
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          {s.back}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { color: colors.textMuted, marginBottom: spacing.lg },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  link: { color: colors.primary, fontWeight: '700' },
});
